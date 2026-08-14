/* =============================================================
 * 《落子无悔》· 主程序：视图切换 / 设置 / 弹窗 / 音频 / 下载
 * ============================================================= */
(function (g) {
  'use strict';
  var U = g.GoUtil, S = g.GoStorage;
  var settings = S.getSettings();
  var VIEWS = ['view-menu', 'view-game', 'view-classroom', 'view-library', 'view-story', 'view-settings'];

  function $(id) { return document.getElementById(id); }

  function showView(name) {
    if (name === 'menu') name = 'view-menu'; // 兼容 data-back="menu"
    for (var i = 0; i < VIEWS.length; i++) {
      var v = $(VIEWS[i]);
      if (v) v.classList.add('hidden');
    }
    var target = $(name);
    if (!target) { U.toast('页面不存在：' + name, 'error'); return; }
    target.classList.remove('hidden');
    window.scrollTo(0, 0);
    if (name === 'view-menu') refreshMenu();
    if (name === 'view-classroom') g.Classroom.show();
    if (name === 'view-library') g.Library.show();
    if (name === 'view-story') g.Story.show();
  }
  function getSettings() { return settings; }
  function setSettings(patch) {
    for (var k in patch) settings[k] = patch[k];
    S.saveSettings(settings);
    syncSettingsUI();
    applyAudioSettings();
    if (g.GamePage && g.GamePage.refreshSettings) g.GamePage.refreshSettings();
  }
  function applyAudioSettings() {
    var A = g.GameAudio;
    A.setSoundEnabled(settings.sound);
    A.setMusicEnabled(settings.music);
    A.setTrack(settings.track);
    A.setMusicVolume(settings.volume);
  }
  function syncSettingsUI() {
    var s = settings;
    var cards = document.querySelectorAll('.skin-card');
    for (var i = 0; i < cards.length; i++) cards[i].classList.toggle('active', cards[i].getAttribute('data-skin') === s.skin);
    $('set-size').value = String(s.size);
    $('set-difficulty').value = s.difficulty;
    $('set-name').value = s.playerName;
    $('set-sound').checked = !!s.sound;
    $('set-music').checked = !!s.music;
    $('set-track').value = s.track;
    $('set-volume').value = Math.round((s.volume || .5) * 100);
    $('set-hints').checked = !!s.hints;
    $('set-comments').checked = !!s.comments;
  }
  /* ---------- 弹窗 ---------- */
  function openModal(html, opts) {
    opts = opts || {};
    var box = $('modal-box');
    box.innerHTML = html;
    $('modal-root').classList.remove('hidden');
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      $('modal-root').classList.add('hidden');
      box.innerHTML = '';
      var bd = $('modal-root').querySelector('.modal-backdrop');
      if (bd) bd.onclick = null;
    }
    if (opts.dismissible !== false) {
      $('modal-root').querySelector('.modal-backdrop').onclick = close;
    }
    return { box: box, close: close };
  }
  function modal(opts) {
    var html = '<div class="modal-title">' + U.esc(opts.title || '') + '</div><div class="modal-body">' + (opts.body || '') + '</div>';
    if (opts.actions && opts.actions.length) {
      html += '<div class="modal-actions">' + opts.actions.map(function (a, idx) {
        return '<button class="btn ' + (a.cls || '') + '" data-act="' + idx + '">' + U.esc(a.label) + '</button>';
      }).join('') + '</div>';
    }
    var m = openModal(html, { dismissible: opts.dismissible !== false });
    var btns = m.box.querySelectorAll('[data-act]');
    for (var i = 0; i < btns.length; i++) {
      (function (b, idx) {
        b.onclick = function () {
          var a = opts.actions[idx];
          if (a.onClick) { var r = a.onClick(); if (r === 'keep') return; }
          m.close();
        };
      })(btns[i], parseInt(btns[i].getAttribute('data-act'), 10));
    }
    return m;
  }
  function downloadFile(name, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 600);
  }
  function refreshMenu() {
    var cur = S.loadCurrent();
    $('btn-continue').classList.toggle('hidden', !cur);
    $('menu-avatar-player').innerHTML = g.Avatars.player('happy');
    $('menu-avatar-ai').innerHTML = g.Avatars.ai('normal');
  }
  /* ---------- 设置绑定 ---------- */
  function bindSettings() {
    var cards = document.querySelectorAll('.skin-card');
    for (var i = 0; i < cards.length; i++) {
      (function (c) {
        c.addEventListener('click', function () {
          var id = c.getAttribute('data-skin');
          setSettings({ skin: id });
          g.GO_SKINS.apply(id);
          if (g.GamePage && g.GamePage.getBoard()) g.GamePage.getBoard().setSkin(id);
          U.toast('已切换皮肤：' + g.GO_SKINS[id].name);
        });
      })(cards[i]);
    }
    $('set-size').addEventListener('change', function () { setSettings({ size: parseInt(this.value, 10) }); });
    $('set-difficulty').addEventListener('change', function () { setSettings({ difficulty: this.value }); });
    $('set-name').addEventListener('change', function () { setSettings({ playerName: this.value.trim() || '棋友' }); });
    $('set-sound').addEventListener('change', function () { setSettings({ sound: this.checked }); });
    $('set-music').addEventListener('change', function () { setSettings({ music: this.checked }); });
    $('set-track').addEventListener('change', function () { setSettings({ track: this.value }); });
    $('set-volume').addEventListener('input', function () {
      settings.volume = this.value / 100;
      S.saveSettings(settings);
      g.GameAudio.setMusicVolume(settings.volume);
    });
    $('set-hints').addEventListener('change', function () { setSettings({ hints: this.checked }); });
    $('set-comments').addEventListener('change', function () { setSettings({ comments: this.checked }); });
    $('btn-export-all').addEventListener('click', function () {
      var games = S.listGames();
      if (!games.length) { U.toast('还没有保存的对局'); return; }
      downloadFile('落子无悔-我的对局.json', JSON.stringify(games, null, 2), 'application/json');
      U.toast('已导出 ' + games.length + ' 局对局记录');
    });
    $('btn-reset-data').addEventListener('click', function () {
      g.App.modal({
        title: '清除全部数据',
        body: '<p>将删除所有对局记录、学习进度与设置，且无法恢复。确定吗？</p>',
        actions: [
          { label: '取消', cls: 'ghost' },
          { label: '确定清除', cls: 'danger', onClick: function () { S.resetAll(); location.reload(); } }
        ]
      });
    });
  }
  function init() {
    applyAudioSettings();
    g.GO_SKINS.apply(settings.skin);
    refreshMenu();
    bindSettings();
    $('btn-new-game').addEventListener('click', function () { g.GamePage.newGameFlow(); });
    $('btn-continue').addEventListener('click', function () { g.GamePage.resume(); });
    $('btn-classroom').addEventListener('click', function () { showView('view-classroom'); });
    $('btn-library').addEventListener('click', function () { showView('view-library'); });
    $('btn-story').addEventListener('click', function () { showView('view-story'); });
    $('btn-settings').addEventListener('click', function () { showView('view-settings'); syncSettingsUI(); });
    var backs = document.querySelectorAll('[data-back]');
    for (var i = 0; i < backs.length; i++) {
      (function (b) {
        b.addEventListener('click', function () { showView(b.getAttribute('data-back')); });
      })(backs[i]);
    }
    var unlocked = false;
    document.addEventListener('pointerdown', function () {
      if (unlocked) return;
      unlocked = true;
      g.GameAudio.unlock();
      if (settings.music) g.GameAudio.playMusic();
    });
    function safe(fn, label) {
      try { fn(); } catch (e) {
        U.toast('初始化出错（' + label + '）：' + (e && e.message ? e.message : e), 'error');
      }
    }
    safe(function () { g.GamePage.init(); }, '对局模块');
    safe(function () { g.Classroom.init(); }, '课堂模块');
    safe(function () { g.Library.init(); }, '棋谱库模块');
    safe(function () { g.Story.init(); }, '故事模块');
    showView('view-menu');
    setTimeout(function () { U.toast('欢迎来到《落子无悔》！推荐先逛「围棋课堂」学规则，再来对局。'); }, 800);
  }
  document.addEventListener('DOMContentLoaded', init);
  g.App = { showView: showView, getSettings: getSettings, setSettings: setSettings, openModal: openModal, modal: modal, downloadFile: downloadFile, refreshMenu: refreshMenu, toast: U.toast };
})(window);
