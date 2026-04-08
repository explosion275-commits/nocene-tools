/**
 * Nocène Credits System
 * Shared across all tool pages.
 * Uses localStorage key: nocene_credits
 *
 * PRODUCTION NOTE: The Anthropic API key is called directly from the frontend
 * in this prototype. In production, all API calls should be proxied through a
 * backend endpoint (e.g. /api/generate) to keep the key secret.
 */
const Nocene = (() => {
  const STORAGE_KEY = 'nocene_credits';
  const DEMO_KEY = 'nocene_demo_claimed';
  const STORE_SLUG = 'nocene';

  function get() {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  }

  function add(n) {
    const current = get();
    localStorage.setItem(STORAGE_KEY, current + n);
    renderBadge();
  }

  function use() {
    const current = get();
    if (current <= 0) return false;
    localStorage.setItem(STORAGE_KEY, current - 1);
    renderBadge();
    return true;
  }

  function has() {
    return get() > 0;
  }

  function claimDemo() {
    if (localStorage.getItem(DEMO_KEY)) return false;
    localStorage.setItem(DEMO_KEY, '1');
    add(1);
    closePaywall();
    return true;
  }

  function hasClaimed() {
    return !!localStorage.getItem(DEMO_KEY);
  }

  function handlePostPurchase() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') !== 'success') return;
    const pkg = parseInt(params.get('pkg'), 10);
    if ([5, 12, 25].includes(pkg)) {
      add(pkg);
      showToast(pkg + ' credits added to your account!');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  function renderBadge() {
    const badges = document.querySelectorAll('.credit-badge-count');
    badges.forEach(b => { b.textContent = get(); });
  }

  function requireCredit(onSuccess) {
    if (has()) {
      use();
      onSuccess();
    } else {
      showPaywall();
    }
  }

  function getLemonURL(pkg) {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const redirect = encodeURIComponent('https://nocene.com/' + page + '?purchase=success&pkg=' + pkg);
    const variants = { 5: 'VARIANT_5', 12: 'VARIANT_12', 25: 'VARIANT_25' };
    return 'https://' + STORE_SLUG + '.lemonsqueezy.com/checkout/buy/' + variants[pkg] + '?checkout[custom][redirect_url]=' + redirect;
  }

  function showPaywall() {
    if (document.getElementById('nocene-paywall')) {
      document.getElementById('nocene-paywall').classList.add('active');
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'nocene-paywall';
    overlay.className = 'active';
    overlay.innerHTML = '<div class="pw-backdrop"></div><div class="pw-modal"><button class="pw-close" onclick="Nocene.closePaywall()">&times;</button><h2>You\'re out of credits</h2><p class="pw-sub">Pick a plan to keep creating with Nocène tools.</p><div class="pw-plans"><div class="pw-plan"><div class="pw-plan-name">Starter</div><div class="pw-plan-credits">5 credits</div><div class="pw-plan-price">$9</div><a href="' + getLemonURL(5) + '" class="pw-btn lemonsqueezy-button">Get 5 Credits</a></div><div class="pw-plan featured"><div class="pw-badge">Most Popular</div><div class="pw-plan-name">Creator</div><div class="pw-plan-credits">12 credits</div><div class="pw-plan-price">$19</div><a href="' + getLemonURL(12) + '" class="pw-btn lemonsqueezy-button">Get 12 Credits</a></div><div class="pw-plan"><div class="pw-plan-name">Pro</div><div class="pw-plan-credits">25 credits</div><div class="pw-plan-price">$35</div><a href="' + getLemonURL(25) + '" class="pw-btn lemonsqueezy-button">Get 25 Credits</a></div></div>' + (!hasClaimed() ? '<a href="#" class="pw-demo" onclick="Nocene.claimDemo(); return false;">or try 1 free generation</a>' : '') + '</div>';
    document.body.appendChild(overlay);
  }

  function closePaywall() {
    const pw = document.getElementById('nocene-paywall');
    if (pw) pw.classList.remove('active');
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'nocene-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
  }

  function init() {
    handlePostPurchase();
    renderBadge();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    get, add, use, has,
    claimDemo, handlePostPurchase,
    renderBadge, requireCredit,
    showPaywall, closePaywall,
    getLemonURL, showToast
  };
})();
