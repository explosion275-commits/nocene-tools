/**
 * NocÃ¨ne Credits System
 * Shared across all tool pages.
 * Uses localStorage key: nocene_credits
 */
const Nocene = (() => {
  const STORAGE_KEY = 'nocene_credits';
  const DEMO_KEY = 'nocene_demo_claimed';
  const STORE_SLUG = 'nocene';

  // --- Lemon Squeezy Variant IDs ---
  const VARIANTS = {
    starter: '1523493',  // 5 credits - $9
    creator: '1523455',  // 12 credits - $19
    pro:     '1523488'   // 25 credits - $35
  };

  const PLAN_CREDITS = {
    starter: 5,
    creator: 12,
    pro: 25
  };

  function get() {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  }

  function add(n) {
    const current = get();
    localStorage.setItem(STORAGE_KEY, current + n);
    renderBadge();
  }

  function use(n) {
    n = n || 1;
    const current = get();
    if (current < n) return false;
    localStorage.setItem(STORAGE_KEY, current - n);
    renderBadge();
    return true;
  }

  function has(n) {
    n = n || 1;
    return get() >= n;
  }

  function claimDemo() {
    if (localStorage.getItem(DEMO_KEY)) return false;
    localStorage.setItem(DEMO_KEY, '1');
    add(1);
    closePaywall();
    showToast('1 free credit added!');
    return true;
  }

  function hasClaimed() {
    return !!localStorage.getItem(DEMO_KEY);
  }

  function handlePostPurchase() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') !== 'success') return;
    const pkg = params.get('pkg');
    const credits = PLAN_CREDITS[pkg] || parseInt(pkg, 10);
    if (credits && credits > 0) {
      add(credits);
      showToast(credits + ' credits added to your account!');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  function renderBadge() {
    const badges = document.querySelectorAll('.credit-badge-count');
    badges.forEach(function(b) { b.textContent = get(); });
    // Also update #creditDisplay and #credit-display for legacy pages
    var cd = document.getElementById('creditDisplay');
    if (cd) cd.textContent = get() + ' Credits';
    var cd2 = document.getElementById('credit-display');
    if (cd2) cd2.textContent = get();
  }

  function requireCredit(onSuccess, n) {
    n = n || 1;
    if (has(n)) {
      use(n);
      onSuccess();
    } else {
      showPaywall();
    }
  }

  function getLemonURL(plan) {
    var variant = VARIANTS[plan];
    if (!variant) return '#';
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var redirect = encodeURIComponent(window.location.origin + '/' + page + '?purchase=success&pkg=' + plan);
    return 'https://' + STORE_SLUG + '.lemonsqueezy.com/checkout/buy/' + variant + '?checkout[custom][redirect_url]=' + redirect;
  }

  function showPaywall() {
    var pw = document.getElementById('nocene-paywall');
    if (pw) {
      pw.classList.add('active');
      return;
    }
    // Dynamically create paywall if not in page
    var overlay = document.createElement('div');
    overlay.id = 'nocene-paywall';
    overlay.className = 'active';
    overlay.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(9,9,14,0.8);backdrop-filter:blur(8px);z-index:1000;align-items:center;justify-content:center;';
    overlay.innerHTML = '<div style="background:#09090e;border:1px solid rgba(232,200,122,0.2);border-radius:16px;padding:48px 40px;max-width:700px;width:90%;position:relative;">' +
      '<button onclick="Nocene.closePaywall()" style="position:absolute;top:20px;right:20px;background:none;border:none;color:#ededf0;font-size:24px;cursor:pointer;">&times;</button>' +
      '<h2 style="font-family:\'DM Serif Display\',serif;font-size:32px;text-align:center;margin-bottom:16px;">Get Credits</h2>' +
      '<p style="color:#b5b5ba;text-align:center;margin-bottom:40px;">Choose a plan to start using Noc&#232;ne tools</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:20px;margin-bottom:40px;">' +
        '<div style="border:1px solid rgba(232,200,122,0.2);border-radius:12px;padding:28px 20px;text-align:center;">' +
          '<div style="font-weight:600;margin-bottom:8px;">Starter</div><div style="font-size:28px;font-weight:600;color:#e8c87a;margin-bottom:8px;">$9</div><div style="font-size:13px;color:#b5b5ba;">5 credits</div></div>' +
        '<div style="border:1px solid #e8c87a;border-radius:12px;padding:28px 20px;text-align:center;background:rgba(232,200,122,0.08);">' +
          '<div style="font-weight:600;margin-bottom:8px;">Creator</div><div style="font-size:28px;font-weight:600;color:#e8c87a;margin-bottom:8px;">$19</div><div style="font-size:13px;color:#b5b5ba;">12 credits</div></div>' +
        '<div style="border:1px solid rgba(232,200,122,0.2);border-radius:12px;padding:28px 20px;text-align:center;">' +
          '<div style="font-weight:600;margin-bottom:8px;">Pro</div><div style="font-size:28px;font-weight:600;color:#e8c87a;margin-bottom:8px;">$35</div><div style="font-size:13px;color:#b5b5ba;">25 credits</div></div>' +
      '</div>' +
      '<a href="' + getLemonURL('creator') + '" class="lemonsqueezy-button" style="display:block;width:100%;background:#e8c87a;color:#09090e;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;text-align:center;">Purchase Credits</a>' +
      (!hasClaimed() ? '<a href="#" onclick="Nocene.claimDemo();return false;" style="display:block;text-align:center;margin-top:16px;color:#e8c87a;text-decoration:none;font-size:14px;">or try 1 free generation</a>' : '') +
    '</div>';
    document.body.appendChild(overlay);
  }

  function closePaywall() {
    var pw = document.getElementById('nocene-paywall');
    if (pw) pw.classList.remove('active');
  }

  function showToast(msg, isError) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:rgba(232,200,122,0.1);border:1px solid #e8c87a;color:#e8c87a;padding:16px 24px;border-radius:8px;font-size:14px;z-index:2000;max-width:300px;transform:translateX(0);opacity:1;transition:all 0.3s ease;';
    if (isError) {
      t.style.background = 'rgba(255,100,100,0.1)';
      t.style.borderColor = '#ff6464';
      t.style.color = '#ff6464';
    }
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() {
      t.style.opacity = '0';
      t.style.transform = 'translateX(100px)';
      setTimeout(function() { t.remove(); }, 400);
    }, 3500);
  }

  function init() {
    handlePostPurchase();
    renderBadge();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    get: get,
    add: add,
    use: use,
    has: has,
    claimDemo: claimDemo,
    handlePostPurchase: handlePostPurchase,
    renderBadge: renderBadge,
    requireCredit: requireCredit,
    showPaywall: showPaywall,
    closePaywall: closePaywall,
    getLemonURL: getLemonURL,
    showToast: showToast
  };
})();
