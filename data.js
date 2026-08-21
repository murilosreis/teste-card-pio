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
    autoAcceptOrders:true,
    waServerUrl:"",
    waServerKey:"",
    printCopies:["Cozinha","Entregador","Controle Interno"]
  },
  products: [],
  combos: [],
  promotions: [],
  orders: [],
  users: [],
  orderCounter: 0
};

const STATUS_FLOW = ["preparo","saiu_entrega","entregue"];
const STATUS_LABEL = {pendente:"Aguardando confirmação", preparo:"Em preparo", saiu_entrega:"Saiu para entrega", entregue:"Entregue", cancelado:"Cancelado"};
const PAY_LABEL = {pix:"Pix", cartao:"Cartão", dinheiro:"Dinheiro"};

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function money(v){ return "R$ " + (Number(v)||0).toFixed(2).replace(".",","); }
function todayStr(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function formatDateBR(d){ if(!d) return ""; const parts = d.split("-"); if(parts.length!==3) return d; return parts[2]+"/"+parts[1]+"/"+parts[0]; }

/* ---------- termos legais (LGPD) — usado no cardápio e no painel ---------- */
function openLegalDoc(kind){
  const store = STATE.config.storeName || "esta loja";
  const wa = (STATE.config.whatsappNumber||"").trim();
  const contactLine = wa ? "pelo WhatsApp cadastrado nesta loja" : "pelos canais de contato desta loja";
  const title = kind === "terms" ? "Termos de Uso" : "Política de Privacidade";
  let body = "";
  if(kind === "terms"){
    body = `
      <h4>1. Sobre este serviço</h4>
      <p>Este é o cardápio digital da ${escapeHtml(store)}, usado para consulta de produtos e envio de pedidos. A ${escapeHtml(store)} é a responsável pela produção, preço, qualidade e entrega dos itens pedidos.</p>
      <h4>2. Como funciona o pedido</h4>
      <p>Ao finalizar um pedido, os dados informados (nome, telefone, endereço e, se autorizado, localização) são enviados à loja para preparo e entrega. A confirmação do pedido acontece por mensagem, e o pagamento é feito diretamente com a loja ou o entregador, na forma escolhida (Pix, cartão ou dinheiro) — este site não processa nem armazena dados de pagamento.</p>
      <h4>3. Responsabilidades do cliente</h4>
      <ul>
        <li>Informar nome, telefone e endereço corretos e atualizados;</li>
        <li>Estar disponível para receber o pedido no endereço e horário combinados;</li>
        <li>Conferir os itens e valores antes de confirmar o pedido.</li>
      </ul>
      <h4>4. Cancelamentos e trocas</h4>
      <p>Cancelamentos, trocas ou reembolsos devem ser tratados diretamente com a ${escapeHtml(store)} ${contactLine}, e seguem o Código de Defesa do Consumidor (Lei nº 8.078/1990).</p>
      <h4>5. Limitação de responsabilidade</h4>
      <p>Este cardápio é uma ferramenta de pedidos. Prazos de entrega, disponibilidade de itens e comunicação por WhatsApp podem sofrer variações fora do controle da plataforma (trânsito, demanda, instabilidade de rede, etc.). Em caso de problema com o pedido, o contato deve ser feito diretamente com a loja.</p>
      <h4>6. Proteção de dados</h4>
      <p>O tratamento dos seus dados pessoais neste cardápio segue a Política de Privacidade, que detalha quais dados são coletados, a base legal, as medidas de segurança adotadas e os seus direitos como titular, nos termos da LGPD (Lei nº 13.709/2018).</p>
      <h4>7. Alterações</h4>
      <p>Estes termos podem ser atualizados a qualquer momento, sem aviso prévio individual. A versão vigente é sempre a publicada nesta página.</p>
      <h4>8. Legislação aplicável</h4>
      <p>Este serviço é regido pelas leis brasileiras, incluindo o Código de Defesa do Consumidor e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
    `;
  } else {
    body = `
      <h4>1. Quem trata seus dados</h4>
      <p>A ${escapeHtml(store)} é a controladora dos dados coletados neste cardápio, nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>
      <h4>2. Quais dados coletamos</h4>
      <ul>
        <li>Nome e telefone, informados no pedido;</li>
        <li>Endereço de entrega e, opcionalmente, localização geográfica exata (somente se você autorizar o acesso pelo navegador);</li>
        <li>Itens do pedido, forma de pagamento escolhida e, se houver, mensagens trocadas sobre o pedido;</li>
        <li>Um identificador salvo no seu navegador (armazenamento local) para você conseguir acompanhar seu próprio pedido depois.</li>
      </ul>
      <h4>3. Base legal para o tratamento (Art. 7º da LGPD)</h4>
      <ul>
        <li><b>Execução de contrato:</b> nome, telefone, endereço e itens do pedido são necessários para processar, preparar e entregar o que você pediu;</li>
        <li><b>Consentimento:</b> a localização geográfica exata só é coletada se você autorizar explicitamente pelo navegador, e pode ser recusada sem impedir o pedido;</li>
        <li><b>Legítimo interesse:</b> o histórico de pedidos pode ser usado para relatórios internos de vendas da ${escapeHtml(store)}.</li>
      </ul>
      <h4>4. Para que usamos esses dados</h4>
      <p>Exclusivamente para processar, preparar, entregar e acompanhar o seu pedido, e para contato sobre ele (confirmação, status e dúvidas). Não usamos seus dados para publicidade nem os vendemos a terceiros.</p>
      <h4>5. Com quem compartilhamos e transferência internacional</h4>
      <p>Os dados ficam visíveis para a equipe da ${escapeHtml(store)} responsável pelo preparo e entrega. São armazenados em serviços de nuvem (Firebase/Google Cloud) que, dependendo da configuração da loja, podem manter servidores fora do Brasil — nesse caso, a transferência segue as garantias exigidas pelo art. 33 da LGPD.</p>
      <h4>6. Segurança da informação (Art. 46 da LGPD)</h4>
      <p>Adotamos medidas técnicas e administrativas para proteger seus dados contra acessos não autorizados e situações acidentais ou ilícitas de destruição, perda, alteração ou vazamento, entre elas:</p>
      <ul>
        <li>Conexão criptografada (HTTPS) entre seu navegador e o servidor;</li>
        <li>Acesso ao painel administrativo restrito por senha, com controle de quais funcionários têm login;</li>
        <li>Regras de acesso ao banco de dados configuradas para permitir apenas as operações necessárias ao funcionamento do cardápio.</li>
      </ul>
      <p>Nenhum sistema é 100% livre de risco. Caso ocorra um incidente de segurança com risco relevante aos seus dados, a ${escapeHtml(store)} se compromete a comunicar a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares afetados em prazo razoável, conforme o art. 48 da LGPD.</p>
      <h4>7. Retenção e eliminação dos dados</h4>
      <p>Os dados do pedido são mantidos pelo tempo necessário para cumprir a finalidade do pedido, obrigações legais e fiscais, e para eventual defesa em processos administrativos ou judiciais. Após esse período, podem ser eliminados ou anonimizados.</p>
      <h4>8. Seus direitos como titular dos dados (Art. 18 da LGPD)</h4>
      <p>Você pode solicitar, a qualquer momento e gratuitamente:</p>
      <ul>
        <li>Confirmação da existência de tratamento dos seus dados;</li>
        <li>Acesso aos seus dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
        <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
        <li>Eliminação dos dados tratados com base no seu consentimento;</li>
        <li>Informação sobre com quem seus dados são compartilhados;</li>
        <li>Informação sobre a possibilidade de não fornecer consentimento e suas consequências;</li>
        <li>Revogação do consentimento dado (por exemplo, a localização);</li>
        <li>Revisão de decisões automatizadas, quando aplicável.</li>
      </ul>
      <h4>9. Como exercer seus direitos</h4>
      <p>Basta entrar em contato ${contactLine}, informando o pedido ou telefone usado, para solicitar qualquer um dos direitos acima.</p>
      <h4>10. Cookies e armazenamento local</h4>
      <p>Este site usa o armazenamento local do seu navegador (não são cookies de rastreamento de terceiros) apenas para lembrar o código do seu último pedido, permitindo acompanhá-lo depois. Você pode limpar esse armazenamento a qualquer momento nas configurações do seu navegador.</p>
      <h4>11. Alterações nesta política</h4>
      <p>Esta política é revisada sempre que o cardápio ganha uma função nova que colete ou use dados de forma diferente da descrita aqui. A versão vigente é sempre a publicada nesta página.</p>
    `;
  }
  openScrim(`
    <div class="sheet" onclick="event.stopPropagation()">
      <div class="cart-head"><h3>${title}</h3><button class="close-x" onclick="closeScrim()">✕</button></div>
      <div class="legal-doc-body">${body}</div>
    </div>`);
}

/* ---------- otimização de imagem no navegador (sem precisar de serviço externo) ---------- */
function compressImageFile(file, maxDim, quality){
  return new Promise((resolve, reject)=>{
    if(!file || !file.type || file.type.indexOf("image/")!==0){ reject(new Error("Arquivo não é uma imagem.")); return; }
    const reader = new FileReader();
    reader.onerror = ()=>reject(new Error("Erro ao ler o arquivo."));
    reader.onload = (e)=>{
      const img = new Image();
      img.onerror = ()=>reject(new Error("Não consegui abrir essa imagem."));
      img.onload = ()=>{
        let width = img.width, height = img.height;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = "";
        try{ dataUrl = canvas.toDataURL("image/webp", quality); }catch(err){}
        if(!dataUrl || dataUrl.indexOf("data:image/webp") !== 0){
          dataUrl = canvas.toDataURL("image/jpeg", quality); // navegador sem suporte a WebP (ex.: Safari antigo)
        }
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
function buildMapsUrl(location){
  if(!location || location.lat==null || location.lng==null) return null;
  return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
}
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
  if(order.location){ const mapsUrl = buildMapsUrl(order.location); if(mapsUrl) lines.push(`📍 Localização: ${mapsUrl}`); }
  lines.push("");
  lines.push("Itens:");
  order.items.forEach(it=>{
    let line = `• ${it.qty}x ${it.name}${it.isCombo ? " (combo)" : ""} — ${money(it.price*it.qty)}`;
    if(it.choices && it.choices.length) line += `\n   ${it.choices.join(" | ")}`;
    if(it.note) line += `\n   Obs: ${it.note}`;
    lines.push(line);
  });
  lines.push("");
  lines.push(`Subtotal: ${money(order.subtotal)}`);
  lines.push(`Entrega: ${money(order.deliveryFee)}`);
  lines.push(`*Total: ${money(order.total)}*`);
  lines.push(`Pagamento: ${PAY_LABEL[order.payment]||order.payment}`);
  if(order.payment==="dinheiro" && order.changeFor){
    lines.push(`💵 Troco para ${money(order.changeFor)} — levar ${money(order.changeAmount)} de troco`);
  }
  return lines.join("\n");
}
function buildWhatsAppUrl(order){
  const digits = (STATE.config.whatsappNumber||"").replace(/\D/g,"");
  if(!digits) return null;
  const text = encodeURIComponent(buildWhatsAppMessage(order));
  return `https://wa.me/${digits}?text=${text}`;
}

/* ---------- WhatsApp: aviso de status pro cliente ---------- */
function normalizeBrazilPhone(raw){
  let digits = (raw||"").replace(/\D/g,"");
  if(!digits) return "";
  if(digits.length===10 || digits.length===11){ digits = "55" + digits; }
  else if(digits.length===12 || digits.length===13){ /* já parece incluir o DDI */ }
  else { return ""; } // não tem cara de telefone brasileiro válido — não arrisca mandar pra número aleatório
  return digits;
}
function buildCustomerStatusMessage(order, status){
  const store = STATE.config.storeName || "nossa loja";
  const lines = [];
  if(status === "entregue"){
    lines.push("Olá, " + order.customerName + "! Seu pedido " + order.code + " foi entregue.");
    lines.push("Muito obrigado por comprar na " + store + "! Esperamos que aproveite e volte sempre.");
  }
  return lines.join("\n");
}
function buildCustomerStatusWhatsAppUrl(order, status){
  const digits = normalizeBrazilPhone(order.phone);
  if(!digits) return null;
  const text = encodeURIComponent(buildCustomerStatusMessage(order, status));
  return `https://wa.me/${digits}?text=${text}`;
}

/* ---------- aviso de chegada do entregador (WhatsApp direto pro cliente) ---------- */
function buildCourierAlertMessage(order, type){
  const store = STATE.config.storeName || "nossa loja";
  if(type === "chegou"){
    return "Olá, " + order.customerName + "! O entregador da " + store + " com o seu pedido " + order.code + " já está na porta.";
  }
  return "Olá, " + order.customerName + "! O entregador da " + store + " com o seu pedido " + order.code + " está chegando.";
}
function buildCourierAlertWhatsAppUrl(order, type){
  const digits = normalizeBrazilPhone(order.phone);
  if(!digits) return null;
  const text = encodeURIComponent(buildCourierAlertMessage(order, type));
  return `https://wa.me/${digits}?text=${text}`;
}

/* ---------- envio automático via servidor próprio (opcional) ---------- */
function sendViaWhatsAppServer(phone, message){
  const url = (STATE.config.waServerUrl||"").trim();
  const key = STATE.config.waServerKey||"";
  if(!url) return Promise.resolve(false);
  return fetch(url.replace(/\/$/,"") + "/send-message", {
    method: "POST",
    headers: {"Content-Type":"application/json", "x-api-key": key},
    body: JSON.stringify({phone: normalizeBrazilPhone(phone), message})
  }).then(r=>r.ok).catch(()=>false);
}
function checkWhatsAppServerStatus(){
  const url = (STATE.config.waServerUrl||"").trim();
  if(!url) return Promise.resolve("nao_configurado");
  return fetch(url.replace(/\/$/,"") + "/status")
    .then(r=>r.json())
    .then(d=>d.status || "desconectado")
    .catch(()=>"erro_conexao");
}
function fetchWhatsAppQr(){
  const url = (STATE.config.waServerUrl||"").trim();
  const key = STATE.config.waServerKey||"";
  if(!url) return Promise.resolve(null);
  return fetch(url.replace(/\/$/,"") + "/qrcode", { headers: {"x-api-key": key} })
    .then(r=>r.json())
    .catch(()=>null);
}

/* ---------- persistência: Firebase (com fallback localStorage) ---------- */
const LS_KEY = "saborDireto_state_v1";

function loadLocal(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      STATE = Object.assign({combos:[], promotions:[], users:[], orderCounter:0}, parsed);
      STATE.config = Object.assign({whatsappNumber:"", autoAcceptOrders:true, deliveryFees:[], printCopies:["Cozinha","Entregador","Controle Interno"]}, STATE.config);
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

function initData(onReady, onOrdersUpdate){
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
      onOrdersUpdate && onOrdersUpdate();
      onReady && onReady();
    }, ()=>handleFirestoreDown(onReady));

    db.collection("config").doc("settings").onSnapshot(doc=>{
      if(doc.exists){ STATE.config = Object.assign(STATE.config, doc.data()); onReady && onReady(); }
    });

    typeof setSyncStatus === "function" && setSyncStatus(true);
  } else {
    loadLocal();
    typeof setSyncStatus === "function" && setSyncStatus(false);
    onOrdersUpdate && onOrdersUpdate();
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
    return db.collection("orders").add(order).then(ref=>{ order.id = ref.id; return ref; }).catch(()=>handleFirestoreDown());
  } else {
    order.id = uid();
    STATE.orders.unshift(order);
    saveLocal();
    return Promise.resolve();
  }
}
function deleteOrderData(id, onDone){
  if(useFirebase){
    db.collection("orders").doc(id).delete().then(()=>onDone&&onDone()).catch(()=>handleFirestoreDown());
  } else {
    STATE.orders = STATE.orders.filter(x=>x.id!==id);
    saveLocal();
    onDone && onDone();
  }
}

/* ---------- mensagens do pedido (dúvidas cliente <-> loja) ---------- */
function addOrderMessage(orderId, sender, text){
  const msg = {sender, text, ts: Date.now()};
  if(useFirebase){
    return db.collection("orders").doc(orderId).update({
      messages: firebase.firestore.FieldValue.arrayUnion(msg)
    }).catch(()=>handleFirestoreDown());
  } else {
    const o = STATE.orders.find(x=>x.id===orderId);
    if(o){ o.messages = o.messages || []; o.messages.push(msg); saveLocal(); }
    return Promise.resolve();
  }
}

/* ---------- número de pedido: contador persistente e atômico ---------- */
function getNextOrderNumberLocal(){
  STATE.orderCounter = (STATE.orderCounter || 0) + 1;
  saveLocal();
  return STATE.orderCounter;
}
function getNextOrderNumber(){
  if(useFirebase){
    const ref = db.collection("counters").doc("orders");
    return db.runTransaction(tx=>{
      return tx.get(ref).then(doc=>{
        const current = doc.exists ? (doc.data().value || 0) : 0;
        const next = current + 1;
        tx.set(ref, {value: next});
        return next;
      });
    }).catch(()=>{ handleFirestoreDown(); return getNextOrderNumberLocal(); });
  } else {
    return Promise.resolve(getNextOrderNumberLocal());
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
