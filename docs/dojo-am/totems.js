const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const S = __dirname;
const abs = p => 'file://' + path.join(S, p);
const ic = (k, c) => abs(`icons/${k}_${c}.png`);
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:900px;height:1600px;overflow:hidden;font-family:'Liberation Sans',Arial,sans-serif;color:#fff}
body{background:radial-gradient(ellipse at 50% 0%,#2a6fd6 0%,#0b3d91 40%,#061f52 100%);position:relative}
body:before{content:'';position:absolute;inset:0;background:
 radial-gradient(circle at 12% 18%,rgba(255,255,255,.18) 0 2px,transparent 3px),
 radial-gradient(circle at 80% 8%,rgba(255,255,255,.22) 0 2px,transparent 3px),
 radial-gradient(circle at 60% 30%,rgba(255,255,255,.14) 0 1.5px,transparent 3px),
 radial-gradient(circle at 25% 70%,rgba(255,255,255,.12) 0 1.5px,transparent 3px),
 radial-gradient(circle at 88% 55%,rgba(255,255,255,.16) 0 2px,transparent 3px),
 radial-gradient(circle at 40% 92%,rgba(255,255,255,.12) 0 1.5px,transparent 3px);pointer-events:none}
.wrap{position:relative;padding:44px 44px 36px;height:100%;display:flex;flex-direction:column;gap:26px}
h1{font-size:60px;line-height:1.05;text-transform:uppercase;text-align:center;letter-spacing:.5px;text-shadow:0 3px 0 rgba(0,0,0,.35),0 6px 18px rgba(0,0,0,.35)}
h1 .y{color:#FFD400}
.sub{font-size:25px;line-height:1.3;text-align:center;color:#eaf2ff;padding:0 30px}
.bar{display:flex;align-items:center;gap:14px;background:linear-gradient(90deg,#1b5ed8,#0d3f9e);border-left:10px solid #FFD400;padding:12px 20px;font-size:29px;font-weight:bold;text-transform:uppercase;box-shadow:0 3px 8px rgba(0,0,0,.35)}
.panel{background:#fff;color:#1a2b4a;border-radius:10px;padding:22px 26px;font-size:24px;line-height:1.38;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.panel b{color:#0b3d91}
.panel ul{padding-left:24px}.panel li{margin:7px 0}
.row{display:flex;gap:16px}
.card{flex:1;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35);border-radius:12px;padding:20px 14px;text-align:center;font-size:22px;line-height:1.28}
.card img{width:84px;height:84px;display:block;margin:0 auto 8px}
.card b{display:block;font-size:25px;color:#FFD400;margin-bottom:6px;text-transform:uppercase}
.yellow{background:#FFD400;color:#1a1a1a;border-radius:10px;padding:18px 22px;font-size:23px;line-height:1.32;display:flex;gap:14px;align-items:center}
.yellow img{width:54px;height:54px;flex:none}
.red{background:linear-gradient(90deg,#d61a1a,#a30c0c);border-radius:10px;padding:18px 22px;font-size:24px;line-height:1.3}
.red b{color:#FFD400;text-transform:uppercase;font-size:28px;display:block;margin-bottom:4px}
.steps{display:flex;flex-direction:column;gap:20px}
.step{display:flex;align-items:center;gap:16px}
.step .arrow{flex:1;position:relative;background:linear-gradient(90deg,#1b5ed8,#0d3f9e);padding:12px 26px 12px 22px;border-radius:8px 0 0 8px;box-shadow:0 4px 10px rgba(0,0,0,.35)}
.step .arrow:after{content:'';position:absolute;right:-28px;top:0;border-top:44px solid transparent;border-bottom:44px solid transparent;border-left:28px solid #0d3f9e}
.step .arrow .n{font-size:36px;font-weight:bold;text-transform:uppercase;color:#fff}
.step .arrow .t{display:block;background:#fff;color:#1a2b4a;font-weight:bold;font-size:24px;line-height:1.15;padding:10px 14px;border-radius:6px;margin-top:6px;text-transform:uppercase}
.step .ico{width:130px;height:130px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#3a8ff5,#0b3d91);border:4px solid #dbe9ff;display:flex;align-items:center;justify-content:center;flex:none;margin-left:36px;box-shadow:0 4px 10px rgba(0,0,0,.4)}
.step .ico img{width:72px;height:72px}
.green{background:linear-gradient(180deg,#1f9d3a,#0f6b25);border:3px solid #7fe08f;border-radius:14px;padding:16px 22px}
.green h2{font-size:40px;text-transform:uppercase;text-align:center;margin-bottom:10px;text-shadow:0 2px 0 rgba(0,0,0,.3)}
.green .it{display:flex;align-items:center;gap:16px;font-size:28px;margin:12px 0}
.green .it img{width:52px;height:52px}
.foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;font-size:16px;letter-spacing:3px;text-transform:uppercase;color:#cfe0ff;border-top:2px solid rgba(255,255,255,.25);padding-top:14px}
.foot img{height:56px}
.hero{display:flex;gap:18px;align-items:stretch}
.hero .panel{flex:1}
.hero img.m{width:270px;height:auto;object-fit:contain;align-self:flex-end;filter:drop-shadow(0 6px 12px rgba(0,0,0,.5))}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.grid4 div{color:#fff;font-weight:bold;text-align:center;padding:14px 6px;border-radius:8px;font-size:21px;text-transform:uppercase}
.tag{display:inline-block;background:#e3f4fb;color:#0b3d91;border-radius:6px;padding:2px 10px;font-weight:bold;font-size:20px;margin:3px 4px 0 0}
.ecrs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center}
.ecrs div{background:#fff;color:#0b3d91;border-radius:8px;padding:10px 4px}
.ecrs b{display:block;font-size:52px;line-height:1}
.ecrs span{font-size:17px;text-transform:uppercase;font-weight:bold}
.big{font-size:29px;text-align:center;font-weight:bold;text-transform:uppercase;color:#FFD400;text-shadow:0 2px 0 rgba(0,0,0,.35);padding:6px}
.pill{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.14);border-radius:10px;padding:14px 16px;font-size:22px;line-height:1.28}
.pill img{width:46px;height:46px;flex:none}
`;
const foot = `<div class="foot"><span>Stellantis · Unidad Pintura</span><img src="${abs('assets/am_logo_white.png')}"></div>`;
const T = {};
T.t1_am = `
<h1><span class="y">AM</span> · MANTENIMIENTO<br>AUTÓNOMO</h1>
<div class="hero">
 <div class="panel"><b>Conjunto de actividades realizadas diariamente por los operadores</b> de producción, con el objetivo de <b>preservar el equipo</b> mediante:
  <div class="grid4" style="margin-top:12px"><div style="background:#1b5ed8">Limpieza</div><div style="background:#d61a1a">Inspección</div><div style="background:#e0b400">Lubricación</div><div style="background:#3d2b1f">Reapriete</div></div>
  <p style="margin-top:12px;font-style:italic">Mejora continua y control de las actividades del propio puesto.</p>
 </div>
 <img class="m" src="${abs('assets/mascot.png')}">
</div>
<div class="bar"><img src="${ic('question','w')}" style="width:34px;height:34px">1 · ¿Por qué hacerlo?</div>
<div class="panel">Para mejorar los equipos, que la mayoría de las veces están en <b>condiciones degradadas</b>:
 <ul><li>Porque las máquinas no alcanzan los <b>objetivos de eficiencia</b>.</li><li>Porque la <b>motivación</b> de las personas ciertamente puede ser <b>mejorada</b>.</li></ul></div>
<div class="bar"><img src="${ic('target','w')}" style="width:34px;height:34px">2 · Objetivos principales</div>
<div class="panel">En los tres primeros pasos se debe trabajar para:
 <ul><li><b>Eliminar las averías</b> por falta de condiciones básicas del equipo.</li><li><b>Reducir el tiempo</b> de las actividades de limpieza, inspección, lubricación y reapriete.</li><li><b>Aumentar la disponibilidad</b> de la máquina y del equipo (OEE).</li></ul></div>
<div class="red"><b>Degradación forzada (foco del AM)</b>Es la degradación acelerada causada por descuido, falta de limpieza, lubricación incorrecta u operación inadecuada. <i>Ejemplo: operar la pistola sin limpiar la boquilla al fin de turno.</i></div>
${foot}`;
T.t2_pasos = `
<h1>VISIÓN GENERAL<br>DE LOS <span class="y">PASOS 0 A 4</span></h1>
<p class="sub">El AM comienza con actividades preliminares y evoluciona a través de cuatro pasos fundamentales para garantizar la confiabilidad de los equipos, reducir fallas y aumentar la eficiencia operacional.</p>
<div class="steps">
 ${[['Paso 0','Actividades preliminares','clipboard'],['Paso 1','Limpieza inicial','broom'],['Paso 2','Eliminación de las fuentes de contaminación y áreas de difícil acceso','search'],['Paso 3','Elaboración de estándares de inspección, limpieza y lubricación','list'],['Paso 4','Administración autónoma y mantenimiento de la calidad','cogs']]
   .map(s=>`<div class="step"><div class="arrow"><span class="n">${s[0]}</span><span class="t">${s[1]}</span></div><div class="ico"><img src="${ic(s[2],'w')}"></div></div>`).join('')}
</div>
<div class="green"><h2>Objetivo final</h2>
 <div class="it"><img src="${ic('cogs','w')}">Equipos en condiciones ideales</div>
 <div class="it"><img src="${ic('user','w')}">Operadores protagonistas</div>
 <div class="it"><img src="${ic('check','w')}">Proceso estable y confiable</div>
</div>
${foot}`;
T.t3_paso1 = `
<h1><span class="y">PASO 1</span> · LIMPIEZA INICIAL</h1>
<div class="hero">
 <div class="panel"><b>Objetivo:</b> restablecer las condiciones básicas del equipo y, al limpiar con las manos, <b>descubrir las anomalías</b> que la suciedad esconde.
  <p style="margin-top:10px;font-size:24px;font-weight:bold;color:#0b3d91;text-align:center">"Limpiar es inspeccionar"</p></div>
 <img class="m" src="${abs('assets/mascot.png')}" style="width:210px">
</div>
<div class="bar"><img src="${ic('broom','w')}" style="width:34px;height:34px">Actividades del paso 1</div>
<div class="panel"><ul>
 <li>Limpieza profunda de todas las partes del equipo, también las de difícil acceso.</li>
 <li>Detección de anomalías: fugas, tornillos flojos, desgaste, suciedad acumulada.</li>
 <li><b>Etiquetado</b> de cada anomalía y registro en el tablero de AM.</li>
 <li>Restablecimiento de las condiciones básicas junto con Mantenimiento.</li></ul></div>
<div class="bar"><img src="${ic('paint','w')}" style="width:34px;height:34px">En Pintura, ¿qué limpiamos e inspeccionamos?</div>
<div class="row">
 <div class="card"><img src="${ic('spray','o')}"><b>Pistolas</b>Boquilla, aguja y patrón de aplicación</div>
 <div class="card"><img src="${ic('filter','o')}"><b>Filtros</b>Saturación y presión diferencial</div>
 <div class="card"><img src="${ic('pump','o')}"><b>Bombas</b>Fugas en sellos y conexiones</div>
</div>
<div class="row">
 <div class="card"><img src="${ic('hose','o')}"><b>Mangueras</b>Roces, desgaste y racores flojos</div>
 <div class="card"><img src="${ic('wind','o')}"><b>Cabina</b>Overspray en rejillas y paredes</div>
</div>
<div class="row">
 <div class="pill" style="flex:1;background:#1b5ed8"><img src="${ic('tag','w')}"><span><b>Etiqueta azul:</b> la resuelve el operador</span></div>
 <div class="pill" style="flex:1;background:#d61a1a"><img src="${ic('tag','w')}"><span><b>Etiqueta roja:</b> la resuelve Mantenimiento</span></div>
</div>
${foot}`;
T.t4_paso2 = `
<h1><span class="y">PASO 2</span> · ELIMINACIÓN DE FUENTES DE CONTAMINACIÓN Y ÁREAS DE DIFÍCIL ACCESO</h1>
<div class="panel"><b>Objetivo:</b> atacar la causa, no el síntoma. Eliminar o contener las fuentes de suciedad y facilitar el acceso a los puntos de limpieza e inspección, para <b>reducir el tiempo</b> de las actividades del paso 1.</div>
<div class="bar"><img src="${ic('search','w')}" style="width:34px;height:34px">Actividades del paso 2</div>
<div class="panel"><ul>
 <li>Elaborar el <b>mapa de fuentes de contaminación</b> del equipo.</li>
 <li>Clasificar cada fuente: ¿se puede <b>eliminar</b>, <b>contener</b> o solo <b>reducir</b>?</li>
 <li>Aplicar contramedidas: protecciones, bandejas, sellados, guías de mangueras.</li>
 <li>Mejorar el acceso: tapas rápidas, ventanas de inspección, mirillas.</li></ul></div>
<div class="bar"><img src="${ic('paint','w')}" style="width:34px;height:34px">Fuentes típicas en Pintura</div>
<div class="row">
 <div class="card"><img src="${ic('wind','o')}"><b>Overspray</b>Pintura pulverizada que se deposita en rejillas, paredes y equipos</div>
 <div class="card"><img src="${ic('pump','o')}"><b>Fugas</b>Sellos de bomba y conexiones que gotean pintura y solvente</div>
 <div class="card"><img src="${ic('hose','o')}"><b>Mangueras</b>Roces y rutas mal definidas que generan desgaste y suciedad</div>
</div>
<div class="yellow"><img src="${ic('exclam','n')}"><span><b>Regla de oro:</b> cada minuto que gastamos limpiando lo mismo todos los días es una fuente de contaminación que todavía no eliminamos.</span></div>
<div class="row">
 <div class="pill" style="flex:1"><img src="${ic('clock','w')}"><span>Medir el tiempo de limpieza <b>antes y después</b> de cada mejora</span></div>
 <div class="pill" style="flex:1"><img src="${ic('lightbulb','w')}"><span>Las ideas de mejora nacen de <b>quien opera</b> el equipo</span></div>
</div>
${foot}`;
T.t5_paso3 = `
<h1><span class="y">PASO 3</span> · ELABORACIÓN DE ESTÁNDARES DE LIMPIEZA, INSPECCIÓN, LUBRICACIÓN Y REAPRIETE <span class="y">(LILR)</span></h1>
<div class="hero">
 <div class="panel">El objetivo principal es <b>estandarizar</b> las actividades de limpieza, inspección, lubricación y reapriete para garantizar que la máquina <b>permanezca en el estado alcanzado</b> y no vuelva al estado anterior.
  <div class="grid4" style="margin-top:12px"><div style="background:#1b5ed8">Limpieza</div><div style="background:#d61a1a">Inspección</div><div style="background:#e0b400">Lubricación</div><div style="background:#3d2b1f">Reapriete</div></div></div>
 <img class="m" src="${abs('assets/mascot.png')}" style="width:200px">
</div>
<div class="yellow"><img src="${ic('exclam','n')}"><span><b>¡Importante!</b> Tendremos <b>cero averías por falta de condiciones básicas</b> al final del 3.º paso. El principal obstáculo para aplicar un estándar es que quien debe aplicarlo no fue quien lo creó.</span></div>
<div class="bar"><img src="${ic('list','w')}" style="width:34px;height:34px">Actividades del paso 3</div>
<div class="panel"><ul>
 <li>Definición por parte del equipo de AM de los estándares de <b>lubricación, limpieza, inspección, frecuencia y método</b>.</li>
 <li>Revisión completa y optimización del sistema de lubricación.</li>
 <li>Control visual para hacer más eficiente cada actividad: <span class="tag">Limpieza · 4 h</span><span class="tag">Inspección · turno</span><span class="tag">Lubricación · semana</span></li></ul></div>
<div class="bar"><img src="${ic('calendar','w')}" style="width:34px;height:34px">Calendario LILR</div>
<div class="panel">El estándar del paso 3 es una <b>evolución del estándar provisorio</b> creado en el paso 1. Frecuencias, tiempos, sistemas de aplicación y recolección se modifican para hacerlo más práctico.</div>
<div class="ecrs"><div><b>E</b><span>Eliminar</span></div><div><b>C</b><span>Combinar</span></div><div><b>R</b><span>Reducir</span></div><div><b>S</b><span>Simplificar</span></div></div>
<div class="big">¡Dejá que quien trabaja establezca los estándares!</div>
${foot}`;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 1600 }, deviceScaleFactor: 2 });
  for (const [name, body] of Object.entries(T)) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="wrap">${body}</div></body></html>`;
    fs.writeFileSync(`totems_pdf/${name}.html`, html);
    await page.goto(abs(`totems_pdf/${name}.html`)); await page.waitForTimeout(150);
    const natural = await page.evaluate(() => { const kids=[...document.querySelector('.wrap').children]; return kids.reduce((a,k)=>a+k.scrollHeight,0)+26*(kids.length-1)+80; });
    if (natural > 1580) await page.evaluate(z => { document.querySelector('.wrap').style.zoom = z; }, 1580 / natural);
    await page.waitForTimeout(100);
    await page.screenshot({ path: `totems_pdf/${name}.png` });
    await page.pdf({ path: `totems_pdf/${name}.pdf`, width: '900px', height: '1600px', printBackground: true, pageRanges: '1' });
    console.log(name, 'natural', natural);
  }
  await browser.close();
})();
