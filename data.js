/* =====================================================================
   FIREBASE CONFIG — troque pelos dados do SEU projeto (Firebase Console
   → Configurações do projeto → Seus apps → SDK setup). Se deixar como
   está, o app roda em modo local (localStorage) automaticamente.
   IMPORTANTE: preencha o MESMO config aqui e no admin.html/index.html
   caso você não use este arquivo compartilhado — mas se estiver usando
   data.js normalmente (recomendado), só precisa editar aqui.
===================================================================== */
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
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
  config: { storeName:"Sabor Direto", deliveryFee:6.0, isOpen:true, adminPassword:"admin123", categories:["Lanches","Bebidas","Sobremesas"] },
  products: [],
  orders: []
};

const STATUS_FLOW = ["recebido","preparo","pronto","entregue"];
const STATUS_LABEL = {recebido:"Recebido", preparo:"Em preparo", pronto:"Pronto", entregue:"Entregue", cancelado:"Cancelado"};
const PAY_LABEL = {pix:"Pix", cartao:"Cartão", dinheiro:"Dinheiro"};

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function money(v){ return "R$ " + (Number(v)||0).toFixed(2).replace(".",","); }
function todayStr(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeAttr(s){ return escapeHtml(s).replace(/`/g,'&#96;'); }
function showToast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove("show"), 2400);
}

/* ---------- persistência: Firebase (com fallback localStorage) ---------- */
const LS_KEY = "saborDireto_state_v1";

function loadLocal(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){ STATE = JSON.parse(raw); }
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
function saveProduct(p, onDone){
  const {id, ...rest} = p;
  if(useFirebase){
    db.collection("products").doc(id).set(rest).then(()=>onDone&&onDone()).catch(()=>handleFirestoreDown());
  } else {
    const idx = STATE.products.findIndex(x=>x.id===id);
    if(idx>=0) STATE.products[idx]=p; else STATE.products.push(p);
    saveLocal();
    onDone && onDone();
  }
}
function deleteProductData(id, onDone){
  if(useFirebase){ db.collection("products").doc(id).delete().then(()=>onDone&&onDone()).catch(()=>handleFirestoreDown()); }
  else { STATE.products = STATE.products.filter(x=>x.id!==id); saveLocal(); onDone && onDone(); }
}
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
