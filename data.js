// FIREBASE CONFIG — chaves do projeto testcardapio (Firebase Console > Configurações do projeto > SDK setup)
const firebaseConfig = {
  apiKey: "AIzaSyD-vIfcA-KU02w4TP5r3JUTUVeAzsOyjh4",
  authDomain: "testcardapio.firebaseapp.com",
  projectId: "testcardapio",
  storageBucket: "testcardapio.firebasestorage.app",
  messagingSenderId: "150203190017",
  appId: "1:150203190017:web:a92a1285fc9678c0bc6900"
};

let db = null;
let useFirebase = false;
let firestoreUnavailable = false;

try{
  if(firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY"){
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    useFirebase = true;
  }
}catch(e){ console.warn("Firebase indisponível, usando modo local.", e); useFirebase = false; }

/* =====================================================================
   ESTADO / DADOS
===================================================================== */
let STATE = {
  config: {
    storeName:"Sabor Direto",
    deliveryFee:6.0,
    deliveryFees: [],
    isOpen:true,
    adminPassword:"admin123",
    categories:["Lanches","Bebidas","Sobremesas"],
    whatsappNumber:"",
    autoAcceptOrders:true
  },
  products: [],
  combos: [],
  promotions: [],
  orders: [],
  users: []
};

const STATUS_FLOW = ["recebido","preparo","pronto","entregue"];
const STATUS_LABEL = {pendente:"Aguardando confirmação", recebido:"Recebido", preparo:"Em preparo", pronto:"Pronto", entregue:"Entregue", cancelado:"Cancelado"};
const PAY_LABEL = {pix:"Pix", cartao:"Cartão", dinheiro:"Dinheiro"};

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function money(v){ return "R$ " + (Number(v)||0).toFixed(2).replace(".",","); }
function todayStr(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function formatDateBR(d){ if(!d) return ""; const parts = d.split("-"); if(parts.length!==3) return d; return parts[2]+"/"+parts[1]+"/"+parts[0]; }
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeAttr(s){ return escapeHtml(s).replace(/`/g,'&#96;'); }
function showToast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove("show"), 2400);
}

/* ---------- cores suaves por categoria (identificação visual) ---------- */
const CATEGORY_PALETTE = [
  {bg:"#EAE3F7", text:"#6B3FA6"},
  {bg:"#DCEFE9", text:"#1F9E86"},
  {bg:"#FBE3E3", text:"#C24B4B"},
  {bg:"#E0EEF9", text:"#3A76A6"},
  {bg:"#F3E3EE", text:"#A6479A"},
  {bg:"#EFEFDA", text:"#8A8A3E"}
];
const COMBO_COLOR = {bg:"#FBEBC7", text:"#9A6A0E"};
function getCategoryColor(name){
  if(name === "Combos") return COMBO_COLOR;
  let hash = 0;
  for(let i=0;i<name.length;i++){ hash = (hash*31 + name.charCodeAt(i)) >>> 0; }
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}

/* ---------- promoções: ajuda de validade ---------- */
function isPromotionActive(promo){
  if(!promo.active) return false;
  if(!promo.endDate) return true;
  const end = new Date(promo.endDate+"T23:59:59");
  return end.getTime() >= Date.now();
}
function activePromotions(){
  return STATE.promotions.filter(isPromotionActive);
}

/* ---------- WhatsApp: montagem da mensagem do pedido ---------- */
function buildWhatsAppMessage(order){
  const lines = [];
  lines.push(`*Novo pedido ${order.code}*`);
  lines.push(`Cliente: ${order.customerName}`);
  lines.push(`Telefone: ${order.phone}`);
  lines.push(`Endereço: ${order.address}`);
  if(order.bairro) lines.push(`Bairro: ${order.bairro}`);
  lines.push("");
  lines.push("Itens:");
  order.items.forEach(it=>{
    let line = `• ${it.qty}x ${it.name}${it.isCombo ? " (combo)" : ""} — ${money(it.price*it.qty)}`;
    if(it.note) line += `\n   Obs: ${it.note}`;
    lines.push(line);
  });
  lines.push("");
  lines.push(`Subtotal: ${money(order.subtotal)}`);
  lines.push(`Entrega: ${money(order.deliveryFee)}`);
  lines.push(`*Total: ${money(order.total)}*`);
  lines.push(`Pagamento: ${PAY_LABEL[order.payment]||order.payment}`);
  return lines.join("\n");
}
function buildWhatsAppUrl(order){
  const digits = (STATE.config.whatsappNumber||"").replace(/\D/g,"");
  if(!digits) return null;
  const text = encodeURIComponent(buildWhatsAppMessage(order));
  return `https://wa.me/${digits}?text=${text}`;
}

/* ---------- persistência: Firebase (com fallback localStorage) ---------- */
const LS_KEY = "saborDireto_state_v1";

function loadLocal(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      STATE = Object.assign({combos:[], promotions:[], users:[]}, parsed);
      STATE.config = Object.assign({whatsappNumber:"", autoAcceptOrders:true, deliveryFees:[]}, STATE.config);
    }
    else { seedDemoData(); saveLocal(); }
  }catch(e){ seedDemoData(); }
}
function saveLocal(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(STATE)); }catch(e){}
}

function seedDemoData(){
  STATE.products = [
    {id:uid(), name:"Cheeseburger Clássico", description:"Blend 160g, queijo cheddar, alface, tomate e molho da casa no pão brioche.", price:24.9, category:"Lanches", image:"", active:true},
    {id:uid(), name:"Duplo Bacon", description:"Dois blends 120g, bacon crocante, cheddar e cebola caramelizada.", price:32.9, category:"Lanches", image:"", active:true},
    {id:uid(), name:"Veggie Grelhado", description:"Hambúrguer de grão-de-bico, rúcula, tomate seco e maionese vegana.", price:26.5, category:"Lanches", image:"", active:true},
    {id:uid(), name:"Refrigerante Lata", description:"350ml, gelado.", price:6.0, category:"Bebidas", image:"", active:true},
    {id:uid(), name:"Suco Natural", description:"Laranja, limão ou maracujá — 500ml.", price:9.0, category:"Bebidas", image:"", active:true},
    {id:uid(), name:"Brownie com Sorvete", description:"Brownie quente com bola de sorvete de creme e calda de chocolate.", price:16.0, category:"Sobremesas", image:"", active:true}
  ];
}

function initData(onReady){
  if(useFirebase){
    db.collection("config").doc("settings").get().then(doc=>{
      if(doc.exists) STATE.config = Object.assign(STATE.config, doc.data());
      else db.collection("config").doc("settings").set(STATE.config);
    }).catch(()=>{ handleFirestoreDown(onReady); });

    db.collection("products").onSnapshot(snap=>{
      STATE.products = snap.docs.map(d=>Object.assign({id:d.id}, d.data()));
      if(STATE.products.length===0 && !window._seeded){
        window._seeded = true;
        seedDemoData();
        STATE.products.forEach(p=>{ const {id, ...rest}=p; db.collection("products").doc(id).set(rest); });
      }
      onReady && onReady();
    }, ()=>handleFirestoreDown(onReady));

    db.collection("combos").onSnapshot(snap=>{
      STATE.combos = snap.docs.map(d=>Object.assign({id:d.id}, d.data()));
      onReady && onReady();
    }, ()=>handleFirestoreDown(onReady));

    db.collection("promotions").onSnapshot(snap=>{
      STATE.promotions = snap.docs.map(d=>Object.assign({id:d.id}, d.data()));
      onReady && onReady();
    }, ()=>handleFirestoreDown(onReady));

    db.collection("users").onSnapshot(snap=>{
      STATE.users = snap.docs.map(d=>Object.assign({id:d.id}, d.data()));
      onReady && onReady();
    }, ()=>handleFirestoreDown(onReady));

    db.collection("orders").orderBy("createdAt","desc").onSnapshot(snap=>{
      STATE.orders = snap.docs.map(d=>Object.assign({id:d.id}, d.data()));
      onReady && onReady();
    }, ()=>handleFirestoreDown(onReady));

    db.collection("config").doc("settings").onSnapshot(doc=>{
      if(doc.exists){ STATE.config = Object.assign(STATE.config, doc.data()); onReady && onReady(); }
    });

    typeof setSyncStatus === "function" && setSyncStatus(true);
  } else {
    loadLocal();
    typeof setSyncStatus === "function" && setSyncStatus(false);
    onReady && onReady();
  }
}

function handleFirestoreDown(onReady){
  if(firestoreUnavailable) return;
  firestoreUnavailable = true;
  useFirebase = false;
  showToast("Sem conexão com o Firebase — usando modo local.");
  loadLocal();
  typeof setSyncStatus === "function" && setSyncStatus(false);
  onReady && onReady();
}

/* ---------- gravação (funciona igual nos dois modos) ---------- */
function saveConfig(){
  if(useFirebase){ db.collection("config").doc("settings").set(STATE.config).catch(()=>handleFirestoreDown()); }
  else { saveLocal(); }
}

function makeCrud(collectionName, stateKey){
  return {
    save(item, onDone){
      const {id, ...rest} = item;
      if(useFirebase){
        db.collection(collectionName).doc(id).set(rest).then(()=>onDone&&onDone()).catch(()=>handleFirestoreDown());
      } else {
        const idx = STATE[stateKey].findIndex(x=>x.id===id);
        if(idx>=0) STATE[stateKey][idx]=item; else STATE[stateKey].push(item);
        saveLocal();
        onDone && onDone();
      }
    },
    remove(id, onDone){
      if(useFirebase){
        db.collection(collectionName).doc(id).delete().then(()=>onDone&&onDone()).catch(()=>handleFirestoreDown());
      } else {
        STATE[stateKey] = STATE[stateKey].filter(x=>x.id!==id);
        saveLocal();
        onDone && onDone();
      }
    }
  };
}
const productsCrud = makeCrud("products","products");
const combosCrud = makeCrud("combos","combos");
const promotionsCrud = makeCrud("promotions","promotions");
const usersCrud = makeCrud("users","users");

function saveProduct(p, onDone){ productsCrud.save(p, onDone); }
function deleteProductData(id, onDone){ productsCrud.remove(id, onDone); }
function saveCombo(c, onDone){ combosCrud.save(c, onDone); }
function deleteComboData(id, onDone){ combosCrud.remove(id, onDone); }
function savePromotion(p, onDone){ promotionsCrud.save(p, onDone); }
function deletePromotionData(id, onDone){ promotionsCrud.remove(id, onDone); }
function saveUser(u, onDone){ usersCrud.save(u, onDone); }
function deleteUserData(id, onDone){ usersCrud.remove(id, onDone); }

function createOrderData(order){
  if(useFirebase){
    return db.collection("orders").add(order).catch(()=>handleFirestoreDown());
  } else {
    order.id = uid();
    STATE.orders.unshift(order);
    saveLocal();
    return Promise.resolve();
  }
}
function updateOrderStatus(orderId, status, onDone){
  if(useFirebase){
    db.collection("orders").doc(orderId).update({status}).then(()=>onDone&&onDone()).catch(()=>handleFirestoreDown());
  } else {
    const o = STATE.orders.find(x=>x.id===orderId);
    if(o) o.status = status;
    saveLocal();
    onDone && onDone();
  }
}
