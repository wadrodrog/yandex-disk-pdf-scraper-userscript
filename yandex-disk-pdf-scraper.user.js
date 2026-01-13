// ==UserScript==
// @name         Yandex Disk PDF Scraper
// @namespace    http://tampermonkey.net/
// @version      2026-01-13
// @description  Downloads undownloadable PDFs from Yandex Disk
// @author       wadrodrog
// @match        https://docs.360.yandex.ru/*
// @match        https://docviewer.360.yandex.ru/*
// @match        https://disk.360.yandex.ru/*
// @match        https://docs.yandex.ru/*
// @match        https://docviewer.yandex.ru/*
// @match        https://disk.yandex.ru/*
// @require      https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// ==/UserScript==

(async function() {
  'use strict';

  const url = window.location.href;

  if (url.includes("/showcaptcha?")) {
    return;
  }

  // download button in top toolbar & bulk download
  if (url.startsWith("https://disk.")) {
    addDownloadButtonInToolbar();
    return;
  }

  // download button in sidebar
  if (url.startsWith("https://docs.")) {
    setTimeout(addDownloadButtonInSidebar, 200);
    setTimeout(async () => {
      if (await GM.getValue("autoDownload", false)) {
        openDocviewerAndStartDownload();
      }
    }, 1000);
    return;
  }

  // download pdf
  if (url.startsWith("https://docviewer.") && window.self === window.top) {
    var info = await getFileInfo();
    downloadPdf(info);
  }
})();

function addDownloadButtonInToolbar() {
  const toolbar = document.querySelector(".resources-action-bar");
  document.body.addEventListener("mouseup", function() {
    setTimeout(() => {
      const container = document.querySelector(".hover-dropdown .hover-tooltip__tooltip-anchor");
      if (container.children.length > 1) {
        return;
      }

      const button = document.createElement("button");
      const buttonIcon = document.createElement("span");

      button.className = "Button2 Button2_view_clear-inverse Button2_size_m resources-action-bar__close";
      button.type = "button";
      button.autocomplete = "off";
      button.ariaLabel = "Скачать";
      button.addEventListener("click", bulkDownload);
      buttonIcon.className = "Button2-Icon";
      buttonIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" focusable="false" fill="none" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M2.5 8v1.9c0 1.011.002 1.664.049 2.158.045.471.12.64.172.726a1.5 1.5 0 0 0 .495.495c.085.053.255.127.726.172.494.047 1.147.049 2.158.049h3.8c1.011 0 1.664-.002 2.158-.049.471-.045.64-.12.726-.172a1.5 1.5 0 0 0 .495-.495c.053-.085.127-.255.172-.726.047-.494.049-1.147.049-2.158V8H15v1.9c0 1.964 0 2.946-.442 3.667a3 3 0 0 1-.99.99C12.845 15 11.863 15 9.9 15H6.1c-1.964 0-2.946 0-3.667-.442a3 3 0 0 1-.99-.99C1 12.845 1 11.863 1 9.9V8zm6.25.19 2.22-2.22 1.06 1.06L8 11.06 3.97 7.03l1.06-1.06 2.22 2.22V1h1.5z"></path></svg>';

      button.appendChild(buttonIcon);
      container.insertBefore(button, container.firstChild);
    }, 100);
  });
}

function bulkDownload() {
  const items = document.querySelectorAll(".listing-item_selected");
  const message = "Скачивание нескольких файлов является экспериментальной функцией. Могут быть ошибки, переполнение памяти, капчи. Не все файлы могут успешно скачаться с первого раза.\n\nВ первый раз ваш браузер заблокирует открытие всплывающих окон.\n\nВы уверены, что хотите продолжить?";

  if (items.length > 1 && !window.confirm(message)) {
    return;
  }

  GM.setValue("autoDownload", true);

  for (var item of items) {
    if (!item.querySelector(".clamped-text").innerText.endsWith(".pdf")) {
      continue;
    }
    const event = new MouseEvent("dblclick", { bubbles: true });
    item.dispatchEvent(event);
  }

  setTimeout(() => { GM.deleteValue("autoDownload"); }, 5000 * items.length);
}

function addDownloadButtonInSidebar() {
  const iframe = document.querySelector("iframe");
  const container = document.querySelector(".LeftColumn__Buttons");
  const button = document.createElement("button");
  const buttonIcon = document.createElement("span");
  const buttonLabel = document.createElement("span");

  button.className = "Button2 Button2_view_raised Button2_size_m Button2_width_max Button2_centeredIcon Docs-Create-Dropdown__Button";
  button.type = "button";
  button.autocomplete = "off";
  button.addEventListener("click", openDocviewerAndStartDownload);
  buttonIcon.className = "Button2-Icon Button2-Icon_side_left";
  buttonIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" focusable="false" fill="none" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M2.5 8v1.9c0 1.011.002 1.664.049 2.158.045.471.12.64.172.726a1.5 1.5 0 0 0 .495.495c.085.053.255.127.726.172.494.047 1.147.049 2.158.049h3.8c1.011 0 1.664-.002 2.158-.049.471-.045.64-.12.726-.172a1.5 1.5 0 0 0 .495-.495c.053-.085.127-.255.172-.726.047-.494.049-1.147.049-2.158V8H15v1.9c0 1.964 0 2.946-.442 3.667a3 3 0 0 1-.99.99C12.845 15 11.863 15 9.9 15H6.1c-1.964 0-2.946 0-3.667-.442a3 3 0 0 1-.99-.99C1 12.845 1 11.863 1 9.9V8zm6.25.19 2.22-2.22 1.06 1.06L8 11.06 3.97 7.03l1.06-1.06 2.22 2.22V1h1.5z"></path></svg>';
  buttonLabel.className = "Button2-Text";
  buttonLabel.innerText = "Скачать";

  button.appendChild(buttonIcon);
  button.appendChild(buttonLabel);
  container.appendChild(button);
}

function openDocviewerAndStartDownload() {
  const iframe = document.querySelector("iframe");
  window.open(iframe.src, "_blank");
  //setTimeout(window.close, 5000);
}

async function getFileInfo() {
  var info = {};

  var container = null;
  while (container === null) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    container = document.querySelector(".js-doc-page > div");
  }

  const htmlimage = container.shadowRoot.querySelector(".page_pdf > div > div > img");
  const filename = document.querySelector(".heading-sm");
  const pageCounter = document.querySelector("span[class^=pageCounter]");

  info.filename = filename.innerText;
  info.pages = pageCounter.innerText.split(" из ")[1];

  info.url = "";

  for (var param of htmlimage.src.split("&")) {
    if (param.startsWith("name=bg-")) {
      continue;
    }
    if (param.startsWith("width=") || param.startsWith("height=")) {
      var part = param.split("=");
      info[part[0]] = parseInt(part[1]);
      continue;
    }
    info.url += param + "&";
  }

  info.orientation = info.width > info.height ? "landscape" : "portrait";
  const scaleFactor = Math.max(info.width, info.height) / Math.min(info.width, info.height);
  if (Math.abs(scaleFactor - 16 / 9) < 0.01) {
    info.width = info.orientation == "landscape" ? 1920 : 1080;
    info.height = info.orientation == "landscape" ? 1080 : 1920;
  } else if (Math.abs(scaleFactor - Math.sqrt(2)) < 0.01) {
    info.width = info.orientation == "landscape" ? 2248 : 1588;
    info.height = info.orientation == "landscape" ? 1588 : 2248;
  }

  info.url += "width=" + info.width;
  info.url += "&height=" + info.height;
  info.url += "&name=";

  return info;
}

function downloadPdf(info) {
  document.querySelector("#app").style.display = "none";

  const progressBar = document.createElement("progress");
  const progressBarLabel = document.createElement("div");
  progressBarLabel.className = "orbHeadTitle_BHee2H328gclV_nqwCi_ heading-sm";
  progressBarLabel.innerText = `Скачивание страниц... (0/${info.pages})`;
  progressBarLabel.style.padding = "20px";
  progressBar.style.marginLeft = "20px";
  progressBar.max = info.pages * 2;
  progressBar.value = 0;
  document.body.appendChild(progressBarLabel);
  document.body.appendChild(progressBar);

  GM.deleteValue("autoDownload");

  const pdf = new jspdf.jsPDF({
    orientation: info.orientation,
    unit: "px",
    format: [info.width, info.height],
      compress: true,
      hotfixes: ["px_scaling"]
  });

  var threads = [];
  var failed = [];
  var fails = 0;

  for (var i = 0; i < info.pages; i++) {
    threads.push(
      fetch(info.url + `bg-${i}.png`)
      .then(response => {
        if (!response.ok || response.url.includes("/showcaptcha?")) {
          fails++; // TODO: figure out how to block variable
          return null;
        }
        progressBar.value++;
        progressBarLabel.innerText = `Скачивание страниц... (${progressBar.value}/${info.pages})`;
        return response.bytes();
      })
    );
  }

  Promise.all(threads)
  .then(async (images) => {
    if (fails > 0 && window.confirm(`Некоторые страницы (${fails}) не удалось скачать из-за капчи.\n\nКак можно избежать капчи:\n- Перезагружать страницу несколько раз\n- Чистить куки (заходить с режима инкогнито или с других браузеров)\n- Войти в аккаунт Яндекса\n\nПерезагрузить страницу и попробовать снова?`)) {
      window.location.reload();
    }

    progressBarLabel.innerText = `Формирование документа... (0/${info.pages})`;

    for (var i = 0; i < images.length; i++) {
      if (i > 0) { // first page already added
        pdf.addPage([info.width, info.height], info.orientation);
      }
      if (images[i] === null) {
        failed.push(i + 1);
      } else {
        pdf.addImage(images[i], "PNG", 0, 0, info.width, info.height);
      }
      progressBar.value++;
      progressBarLabel.innerText = `Формирование документа... (${i + 1}/${info.pages})`;
      await new Promise(resolve => setTimeout(resolve, 0)); // updates page after addImage hang
    }
  })
  .then(() => {
    if (failed.length > 0) {
      alert("Внимание, некоторые страницы не удалось сохранить: " + failed.join(", "));
    }
    progressBarLabel.innerText = `Сохранение документа...`;
    pdf.save(info.filename);
  })
  .then(() => setTimeout(window.close, 5000));
}
