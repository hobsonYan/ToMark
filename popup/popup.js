// ToMark - Popup 脚本

const STORAGE_KEY = 'tomark_data';
let allHighlights = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  await loadHighlights();
  setupEventListeners();
});

async function loadHighlights() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  allHighlights = result[STORAGE_KEY] || [];
  updateStats();
  renderList();
}

function updateStats() {
  const totalCount = allHighlights.length;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0]?.url || '';
    const pageCount = allHighlights.filter(h => h.url === currentUrl).length;
    
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('pageCount').textContent = pageCount;
  });
}

function renderList() {
  const list = document.getElementById('highlightsList');
  
  // 获取当前 tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0]?.url || '';
    
    let highlights = allHighlights;
    if (currentFilter === 'current') {
      highlights = allHighlights.filter(h => h.url === currentUrl);
    }
    
    if (highlights.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="icon">📝</div>
          <p>${currentFilter === 'current' ? '本页暂无批注' : '还没有批注'}</p>
          <p style="font-size:11px;margin-top:4px;">选中文字后点击高亮按钮添加批注</p>
        </div>
      `;
      return;
    }
    
    // 按时间倒序
    const sorted = [...highlights].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const colorMap = {
      yellow: '#FFEB3B',
      green: '#4CAF50',
      blue: '#2196F3',
      pink: '#E91E63'
    };
    
    list.innerHTML = sorted.map(h => `
      <div class="highlight-item" data-id="${h.id}" data-url="${escapeAttr(h.url)}">
        <div class="highlight-text">${escapeHtml(h.text)}</div>
        ${h.note ? `<div class="highlight-note">📝 ${escapeHtml(h.note)}</div>` : ''}
        <div class="highlight-meta">
          <span class="highlight-color" style="background:${colorMap[h.color] || '#FFEB3B'}"></span>
          <span>${formatDate(h.createdAt)}</span>
          <span class="tomark-del-btn" data-id="${h.id}" title="删除">🗑️</span>
        </div>
      </div>
    `).join('');
    
    // 点击跳转到批注
    list.querySelectorAll('.highlight-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (e.target.classList.contains('tomark-del-btn')) {
          e.stopPropagation();
          return;
        }
        
        const url = item.dataset.url;
        chrome.tabs.update({ url });
      });
    });
    
    // 删除按钮
    list.querySelectorAll('.tomark-del-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        
        allHighlights = allHighlights.filter(h => h.id !== id);
        await chrome.storage.local.set({ [STORAGE_KEY]: allHighlights });
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'deleteHighlight', id });
        });
        
        renderList();
        updateStats();
      });
    });
  });
}

function setupEventListeners() {
  // 筛选按钮
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderList();
    });
  });
  
  // 导出按钮
  document.getElementById('exportBtn').addEventListener('click', () => {
    if (allHighlights.length === 0) {
      alert('没有批注可导出');
      return;
    }
    
    const text = allHighlights.map(h => {
      let line = `"${h.text}"\n来源: ${h.url}\n时间: ${formatDate(h.createdAt)}`;
      if (h.note) line += `\n批注: ${h.note}`;
      return line;
    }).join('\n\n' + '='.repeat(50) + '\n\n');
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: 'tomark-export.txt', saveAs: true });
  });
  
  // 清空按钮
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (allHighlights.length === 0) return;
    
    if (confirm(`确定要清空所有 ${allHighlights.length} 条批注吗？`)) {
      await chrome.storage.local.set({ [STORAGE_KEY]: [] });
      allHighlights = [];
      renderList();
      updateStats();
    }
  });
  
  // 新批注按钮
  document.getElementById('newBtn').addEventListener('click', () => {
    window.close();
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return text.replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
