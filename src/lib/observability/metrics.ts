type Metric={help:string;type:"counter"|"gauge";value:number};
const registry=globalThis as typeof globalThis&{__cuveeMetrics?:Map<string,Metric>};
const metrics=registry.__cuveeMetrics??=new Map();
export function increment(name:string,help:string,amount=1){const metric=metrics.get(name)??{help,type:"counter" as const,value:0};metric.value+=amount;metrics.set(name,metric);}
export function gauge(name:string,help:string,value:number){metrics.set(name,{help,type:"gauge",value});}
export function renderMetrics(){return [...metrics.entries()].map(([name,m])=>`# HELP ${name} ${m.help}\n# TYPE ${name} ${m.type}\n${name} ${m.value}`).join("\n")+"\n";}
