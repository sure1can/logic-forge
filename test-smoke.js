// 冒烟测试：从 index.html 提取核心逻辑（渲染之前），在 Node 里跑一遍
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const core = js.split('/* ---------- 渲染：首页')[0];

const tests = `
;(function(){
global.__results = {pass:0, fail:0, fails:[]};
function T(name, cond){ if(cond){ global.__results.pass++; } else { global.__results.fail++; global.__results.fails.push(name); } }
function mk(kind, params, body){
  const b = newBlock(kind);
  if(params) b.params = Object.assign(b.params, params);
  if(body) b.body = body;
  return b;
}

// 测试1：倒数 5..1（灵魂关卡的正确拼法）
S.vars = {倒计时:5};
S.blocks = [ mk('while', {stop:{left:'倒计时',op:'==',right:'0'}}, [
  mk('print', {expr:'倒计时'}),
  mk('set', {var:'倒计时', expr:'倒计时 - 1'})
]) ];
let r = runProgram();
T('倒数输出 5 个数', r.output.length===5 && r.output.join('')==='54321');
T('没有错误', !r.error);
T('正常终止', !r.dead);

// 测试2：死循环（出口永远到不了）
S.vars = {n:1};
S.blocks = [ mk('while', {stop:{left:'n',op:'>',right:'100'}}, [
  mk('set', {var:'n', expr:'1'})
]) ];
r = runProgram();
T('死循环被检测', r.dead===true && !!r.error);

// 测试3：筛选+累加（综合关）
S.vars = {价格:[120,45,200,88,150,30]};
S.blocks = [
  mk('filter', {list:'价格',item:'每一项',cond:{left:'每一项',op:'>',right:'100'},out:'贵的'}),
  mk('sum', {list:'贵的',item:'每一项',out:'总价',start:'0'}),
  mk('print', {expr:'总价'})
];
r = runProgram();
T('筛选出3件', Array.isArray(r.state['贵的']) && r.state['贵的'].length===3);
T('总价470', r.state['总价']===470);
T('输出470', r.output.length===1 && r.output[0]===470);

// 测试4：计数
S.vars = {成绩单:[55,90,47,88,61,73,59,82]};
S.blocks = [
  mk('count', {list:'成绩单',item:'每一项',cond:{left:'每一项',op:'>=',right:'60'},out:'个数'}),
  mk('print', {expr:'个数'})
];
r = runProgram();
T('及格5人', r.state['个数']===5);

// 测试5：条件（否则）+ for + 字符串拼接
S.vars = {分数:72, 同学:['小明','小红','小刚']};
const ifb = mk('if', {cond:{left:'分数',op:'>=',right:'60'}, hasElse:true}, [ mk('print', {expr:'及格'}) ]);
ifb.elseBody = [ mk('print', {expr:'不及格'}) ];
S.blocks = [
  ifb,
  mk('for', {list:'同学', item:'每一个'}, [ mk('print', {expr:'"加油，" + 每一个'}) ])
];
r = runProgram();
T('及格分支', r.output[0]==='及格');
T('for拼接3句', r.output.length===4 && r.output[3]==='加油，小刚');

// 测试6：Python 生成（用回 while 倒数结构）
S.vars = {倒计时:5};
S.blocks = [ mk('while', {stop:{left:'倒计时',op:'==',right:'0'}}, [
  mk('print', {expr:'倒计时'}),
  mk('set', {var:'倒计时', expr:'倒计时 - 1'})
]) ];
const py = genPython();
T('Python含出口注释', py.includes('# 出口：当 倒计时 == 0 时停'));
T('Python含print', py.includes('print'));

// 测试7：结构检查（空出口）
S.blocks = [ newBlock('while') ];
const iss = checkStructure();
T('空出口被查出', iss.some(s=>s.includes('出口')));

// 测试8：查找
S.vars = {年龄表:[15,16,17,18,20,22]};
S.blocks = [
  mk('find', {list:'年龄表',item:'每一项',cond:{left:'每一项',op:'>=',right:'18'},out:'找到的'}),
  mk('print', {expr:'找到的'})
];
r = runProgram();
T('找到18', r.state['找到的']===18);

// 测试9：norm 格式化（用于答案比对）
T('数组norm', norm([8,15,22])==='8,15,22');
T('null norm', norm(null)==='未找到');

// 测试10：表达式危险词被拦截
let blocked = false;
try{ evalExpr('window.name', {}); }catch(e){ blocked = true; }
T('危险表达式被拦截', blocked);
})();
`;

// 给纯逻辑部分补一个 document 桩（原代码只有顶部一行弹层绑定用到它）
global.document = {
  querySelector: () => ({ addEventListener(){}, classList:{add(){},remove(){},toggle(){}}, textContent:'', innerHTML:'' }),
  addEventListener(){},
  querySelectorAll: () => []
};

(0, eval)(core + tests);
const R = global.__results;
R.fails.forEach(f => console.log('FAIL: ' + f));
console.log('通过: ' + R.pass + '，失败: ' + R.fail);
process.exit(R.fail ? 1 : 0);
