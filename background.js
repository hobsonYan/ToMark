// ToMark - 后台脚本
// 处理扩展生命周期事件

chrome.runtime.onInstalled.addListener(() => {
  console.log('ToMark 已安装');
});

// 快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-highlight') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'createHighlight' });
    });
  }
});
