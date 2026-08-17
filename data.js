:root{
  --purple-900:#2A0F4E;
  --purple-700:#4B1F7A;
  --purple-600:#5C2A93;
  --purple-500:#7440AD;
  --gold-500:#E3A72E;
  --gold-300:#F0C568;
  --gold-100:#FBEBC7;
  --orange:#F2622E;
  --white:#FFFFFF;
  --ink:#221733;
  --ink-soft:#5B4D72;
  --gray-50:#F8F6FC;
  --gray-100:#EFEAF7;
  --gray-200:#E1D9F0;
  --gray-300:#CBBFE3;
  --teal:#1F9E86;
  --teal-100:#E1F5F1;
  --red:#D6455B;
  --red-100:#FBE6EA;
  --amber-100:#FCF0DA;
  --shadow-sm:0 2px 8px rgba(42,15,78,.08);
  --shadow-md:0 8px 24px rgba(42,15,78,.14);
  --shadow-lg:0 20px 48px rgba(42,15,78,.22);
  --radius:16px;
  --radius-sm:10px;
  --font-display:'Space Grotesk',sans-serif;
  --font-body:'Inter',sans-serif;
  --font-mono:'JetBrains Mono',monospace;
}
*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{
  font-family:var(--font-body);
  color:var(--ink);
  background:var(--gray-50);
  -webkit-font-smoothing:antialiased;
  min-height:100vh;
}
h1,h2,h3,h4{font-family:var(--font-display);letter-spacing:-0.02em;}
button{font-family:inherit;cursor:pointer;border:none;background:none;}
input,select,textarea{font-family:inherit;font-size:15px;}
a{color:inherit;text-decoration:none;}
img{max-width:100%;display:block;}
::selection{background:var(--gold-300);color:var(--ink);}

/* ---------- diamond pattern (signature motif) ---------- */
.diamond-field{position:relative;overflow:hidden;background:var(--purple-700);}
.diamond-field::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background-image:
    linear-gradient(135deg, transparent 46%, rgba(227,167,46,.55) 46% 54%, transparent 54%),
    linear-gradient(45deg, transparent 46%, rgba(255,255,255,.10) 46% 54%, transparent 54%);
  background-size:120px 120px, 90px 90px;
  background-position:0 0, 45px 30px;
  opacity:.5;
  mix-blend-mode:screen;
}
.diamond-field::after{
  content:"";position:absolute;top:0;left:0;
  border-style:solid;border-width:0 0 26px 26px;
  border-color:transparent transparent transparent var(--orange);
}
.diamond-field > *{position:relative;z-index:1;}

/* ---------- utility ---------- */
.container{max-width:1180px;margin:0 auto;padding:0 20px;}
.pill{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:600;}
.badge-diamond{width:7px;height:7px;background:var(--gold-500);transform:rotate(45deg);display:inline-block;flex-shrink:0;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:12px;font-weight:600;font-size:14.5px;transition:transform .15s ease, box-shadow .15s ease, background .15s ease;}
.btn:active{transform:scale(.97);}
.btn-primary{background:var(--purple-700);color:var(--white);box-shadow:var(--shadow-sm);}
.btn-primary:hover{background:var(--purple-600);box-shadow:var(--shadow-md);}
.btn-gold{background:var(--gold-500);color:var(--purple-900);box-shadow:var(--shadow-sm);}
.btn-gold:hover{background:var(--gold-300);}
.btn-ghost{background:var(--white);color:var(--purple-700);border:1.5px solid var(--gray-200);}
.btn-ghost:hover{border-color:var(--purple-500);}
.btn-danger{background:var(--red-100);color:var(--red);}
.btn-block{width:100%;}
.btn-sm{padding:8px 14px;font-size:13px;border-radius:9px;}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.field label{font-size:13px;font-weight:600;color:var(--ink-soft);}
.field input,.field select,.field textarea{
  padding:11px 13px;border:1.5px solid var(--gray-200);border-radius:10px;background:var(--white);color:var(--ink);
  transition:border-color .15s;
}
.field input:focus,.field select:focus,.field textarea:focus{outline:none;border-color:var(--purple-500);}
.field textarea{resize:vertical;min-height:70px;}
.hidden{display:none !important;}
.card{background:var(--white);border-radius:var(--radius);box-shadow:var(--shadow-sm);}
.scrim{position:fixed;inset:0;background:rgba(42,15,78,.45);backdrop-filter:blur(2px);z-index:50;display:flex;align-items:flex-end;justify-content:center;}
@media(min-width:720px){.scrim{align-items:center;}}
.sheet{background:var(--white);width:100%;max-width:480px;border-radius:20px 20px 0 0;max-height:92vh;overflow-y:auto;box-shadow:var(--shadow-lg);animation:slideUp .25s ease;}
@media(min-width:720px){.sheet{border-radius:20px;}}
@keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--white);padding:13px 22px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:var(--shadow-lg);z-index:200;opacity:0;pointer-events:none;transition:opacity .2s, transform .2s;}
.toast.show{opacity:1;transform:translateX(-50%) translateY(-6px);}

.cart-head{padding:20px 22px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--gray-100);}
.cart-head h3{font-size:18px;}
.close-x{width:32px;height:32px;border-radius:9px;background:var(--gray-100);color:var(--ink-soft);font-size:16px;}
.detail-body{padding:22px;}
.sum-row{display:flex;justify-content:space-between;font-size:13.5px;color:var(--ink-soft);margin-bottom:6px;}
.sum-row.total{font-size:17px;font-weight:700;color:var(--ink);margin-top:8px;font-family:var(--font-display);}
.sum-row.total span:last-child{font-family:var(--font-mono);}
.empty-state{text-align:center;padding:60px 20px;color:var(--ink-soft);}
.empty-state .badge-diamond{width:14px;height:14px;margin-bottom:14px;}
.status-badge{font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:999px;text-transform:uppercase;letter-spacing:.03em;}
.status-badge.recebido{background:var(--amber-100);color:#9A6A0E;}
.status-badge.preparo{background:#E3E0FA;color:#5B3FC9;}
.status-badge.pronto{background:var(--teal-100);color:var(--teal);}
.status-badge.entregue{background:var(--gray-100);color:var(--ink-soft);}
.status-badge.cancelado{background:var(--red-100);color:var(--red);}
