// ToMark - 内容脚本
// 负责在网页上实现高亮和批注功能

class ToMark {
  constructor() {
    this.storageKey = 'tomark_data';
    this.currentSelection = null;
    this.highlightColors = {
      yellow: '#FFEB3B',
      green: '#4CAF50',
      blue: '#2196F3',
      pink: '#E91E63'
    };
    this.currentColor = 'yellow';
    this.tooltip = null;
    this.pageHighlights = [];
    this.init();
  }

  async init() {
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await this.loadPageHighlights();
    this.renderHighlights();
    
    document.addEventListener('mouseup', (e) => this.handleSelection(e));
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    document.addEventListener('mousedown', (e) => {
      if (this.tooltip && !this.tooltip.contains(e.target)) {
        this.removeTooltip();
      }
    });
    
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === 'deleteHighlight') {
        this.deleteHighlight(msg.id);
        sendResponse({ success: true });
      }
    });
  }

  async loadPageHighlights() {
    const result = await chrome.storage.local.get(this.storageKey);
    const allHighlights = result[this.storageKey] || [];
    this.pageHighlights = allHighlights.filter(h => h.url === window.location.href);
  }

  renderHighlights() {
    document.querySelectorAll('.tomark-highlight').forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    });

    this.injectStyles();

    for (const hl of this.pageHighlights) {
      this.renderHighlight(hl);
    }
  }

  renderHighlight(data) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent;
      const index = text.indexOf(data.text);
      
      if (index !== -1) {
        try {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + data.text.length);
          
          const contents = range.extractContents();
          
          const highlight = document.createElement('mark');
          highlight.className = `tomark-highlight tomark-${data.color}`;
          highlight.dataset.id = data.id;
          highlight.dataset.color = data.color;
          if (data.note) highlight.dataset.note = data.note;
          
          highlight.appendChild(contents);
          range.insertNode(highlight);
          
          highlight.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showHighlightMenu(highlight);
          });
          
          return;
        } catch (e) {
          console.log('ToMark: 无法渲染此高亮');
        }
      }
    }
  }

  handleSelection(e) {
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (!selectedText || selectedText.length < 1) {
        return;
      }
      
      this.currentSelection = {
        text: selectedText,
        range: selection.getRangeAt(0).cloneRange()
      };
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      this.showTooltip(rect.left + rect.width / 2, rect.bottom + window.scrollY + 10);
      
    }, 10);
  }

  handleKeydown(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'H') {
      e.preventDefault();
      this.createHighlight();
    }
  }

  showTooltip(x, y) {
    this.removeTooltip();
    
    const container = document.createElement('div');
    container.id = 'tomark-container';
    container.innerHTML = `
      <div class="tomark-tooltip">
        <span class="tomark-title">ToMark</span>
        <div class="tomark-colors">
          <button data-color="yellow" style="background:#FFEB3B" title="黄色"></button>
          <button data-color="green" style="background:#4CAF50" title="绿色"></button>
          <button data-color="blue" style="background:#2196F3" title="蓝色"></button>
          <button data-color="pink" style="background:#E91E63" title="粉色"></button>
        </div>
        <button class="tomark-note-btn">📝 批注</button>
      </div>
    `;
    
    container.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      transform: translateX(-50%);
      z-index: 2147483647;
    `;
    
    this.injectStyles();
    document.body.appendChild(container);
    this.tooltip = container;
    
    container.querySelectorAll('.tomark-colors button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.currentColor = btn.dataset.color;
        this.createHighlight();
        this.removeTooltip();
      });
    });
    
    container.querySelector('.tomark-note-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.showNoteDialog();
    });
  }

  removeTooltip() {
    const existing = document.getElementById('tomark-container');
    if (existing) existing.remove();
    this.tooltip = null;
  }

  injectStyles() {
    if (document.getElementById('tomark-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'tomark-styles';
    style.textContent = `
      #tomark-container { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
      .tomark-tooltip { background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); padding: 8px 12px; display: flex; align-items: center; gap: 8px; }
      .tomark-title { font-weight: 600; font-size: 12px; color: #667eea; margin-right: 4px; }
      .tomark-colors button { width: 24px; height: 24px; border: 2px solid transparent; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
      .tomark-colors button:hover { transform: scale(1.15); border-color: #333; }
      .tomark-note-btn { background: #667eea; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }
      mark.tomark-yellow { background-color: #FFEB3B !important; }
      mark.tomark-green { background-color: #4CAF50 !important; }
      mark.tomark-blue { background-color: #2196F3 !important; }
      mark.tomark-pink { background-color: #E91E63 !important; }
      mark.tomark-highlight { border-radius: 2px; cursor: pointer; }
    `;
    document.head.appendChild(style);
  }

  createHighlight() {
    if (!this.currentSelection) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    
    try {
      const contents = range.extractContents();
      
      const highlight = document.createElement('mark');
      highlight.className = `tomark-highlight tomark-${this.currentColor}`;
      highlight.dataset.id = Date.now().toString();
      highlight.dataset.color = this.currentColor;
      
      highlight.appendChild(contents);
      range.insertNode(highlight);
      
      selection.removeAllRanges();
      this.currentSelection = null;
      
      const data = {
        id: highlight.dataset.id,
        text: selectedText,
        url: window.location.href,
        title: document.title,
        color: this.currentColor,
        createdAt: new Date().toISOString()
      };
      
      this.saveHighlight(data);
      this.pageHighlights.push(data);
      
      highlight.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showHighlightMenu(highlight);
      });
      
    } catch (e) {
      console.error('ToMark: 高亮失败', e);
    }
  }

  showHighlightMenu(el) {
    const existing = document.getElementById('tomark-highlight-menu');
    if (existing) existing.remove();
    
    const menu = document.createElement('div');
    menu.id = 'tomark-highlight-menu';
    menu.innerHTML = `
      <div class="tomark-menu-colors">
        <button data-color="yellow" style="background:#FFEB3B" title="黄色"></button>
        <button data-color="green" style="background:#4CAF50" title="绿色"></button>
        <button data-color="blue" style="background:#2196F3" title="蓝色"></button>
        <button data-color="pink" style="background:#E91E63" title="粉色"></button>
      </div>
      <button class="tomark-delete">🗑️ 删除</button>
    `;
    
    menu.style.cssText = `
      position: fixed;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      padding: 8px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    const rect = el.getBoundingClientRect();
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    
    document.body.appendChild(menu);
    
    menu.querySelectorAll('.tomark-menu-colors button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.changeHighlightColor(el, btn.dataset.color);
        menu.remove();
      });
    });
    
    menu.querySelector('.tomark-delete').addEventListener('click', () => {
      this.deleteHighlight(el.dataset.id);
      menu.remove();
    });
    
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove());
    }, 100);
  }

  changeHighlightColor(el, newColor) {
    el.classList.remove(`tomark-${el.dataset.color}`);
    el.classList.add(`tomark-${newColor}`);
    el.dataset.color = newColor;
    this.updateHighlightColor(el.dataset.id, newColor);
  }

  async updateHighlightColor(id, newColor) {
    const result = await chrome.storage.local.get(this.storageKey);
    const highlights = result[this.storageKey] || [];
    
    const updated = highlights.map(h => {
      if (h.id === id) return { ...h, color: newColor };
      return h;
    });
    
    await chrome.storage.local.set({ [this.storageKey]: updated });
  }

  showNoteDialog() {
    const selectedText = this.currentSelection?.text || '';
    
    const dialog = document.createElement('div');
    dialog.id = 'tomark-note-dialog';
    dialog.innerHTML = `
      <div class="tomark-dialog-box">
        <div class="tomark-dialog-header">添加批注</div>
        <div class="tomark-dialog-preview">"${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"</div>
        <textarea placeholder="写下你的批注..." rows="3"></textarea>
        <div class="tomark-dialog-footer">
          <button class="tomark-cancel">取消</button>
          <button class="tomark-save">保存</button>
        </div>
      </div>
    `;
    
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2147483647;
    `;
    
    if (!document.getElementById('tomark-dialog-styles')) {
      const style = document.createElement('style');
      style.id = 'tomark-dialog-styles';
      style.textContent = `
        .tomark-dialog-box { background: white; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,0.25); padding: 20px; width: 320px; font-family: -apple-system, sans-serif; }
        .tomark-dialog-header { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        .tomark-dialog-preview { background: #f5f5f5; padding: 10px; border-radius: 6px; font-size: 13px; color: #666; margin-bottom: 12px; }
        .tomark-dialog-box textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: none; font-size: 14px; box-sizing: border-box; }
        .tomark-dialog-footer { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }
        .tomark-cancel { background: #f0f0f0; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
        .tomark-save { background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('.tomark-cancel').addEventListener('click', () => {
      dialog.remove();
      this.removeTooltip();
    });
    
    dialog.querySelector('.tomark-save').addEventListener('click', () => {
      const note = dialog.querySelector('textarea').value.trim();
      if (note) this.createHighlightWithNote(note);
      dialog.remove();
    });
    
    dialog.querySelector('textarea').focus();
  }

  createHighlightWithNote(note) {
    if (!this.currentSelection) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    
    try {
      const contents = range.extractContents();
      
      const highlight = document.createElement('mark');
      highlight.className = `tomark-highlight tomark-${this.currentColor}`;
      highlight.dataset.id = Date.now().toString();
      highlight.dataset.note = note;
      highlight.dataset.color = this.currentColor;
      
      highlight.appendChild(contents);
      range.insertNode(highlight);
      
      const data = {
        id: highlight.dataset.id,
        text: selectedText,
        note: note,
        url: window.location.href,
        title: document.title,
        color: this.currentColor,
        createdAt: new Date().toISOString()
      };
      
      this.saveHighlight(data);
      this.pageHighlights.push(data);
      
      selection.removeAllRanges();
      this.currentSelection = null;
      
      highlight.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showHighlightMenu(highlight);
      });
      
    } catch (e) {
      console.error('ToMark: 高亮失败', e);
    }
  }

  async saveHighlight(data) {
    const result = await chrome.storage.local.get(this.storageKey);
    const highlights = result[this.storageKey] || [];
    highlights.push(data);
    await chrome.storage.local.set({ [this.storageKey]: highlights });
  }

  async deleteHighlight(id) {
    const el = document.querySelector(`mark[data-id="${id}"]`);
    if (el) {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    }
    
    const result = await chrome.storage.local.get(this.storageKey);
    const highlights = result[this.storageKey] || [];
    const filtered = highlights.filter(h => h.id !== id);
    await chrome.storage.local.set({ [this.storageKey]: filtered });
    
    this.pageHighlights = this.pageHighlights.filter(h => h.id !== id);
  }
}

new ToMark();
console.log('ToMark 已加载');
