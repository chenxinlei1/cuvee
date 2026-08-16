type Level="info"|"warn"|"error";
const SENSITIVE_KEY=/(password|passwd|token|secret|authorization|cookie|api[_-]?key|private[_-]?key|credential)/i;
/** Never write credentials or bearer values into structured logs. */
function redact(fields: Record<string,unknown>): Record<string,unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key,value]) => (SENSITIVE_KEY.test(key) ? [key,"[REDACTED]"] : [key,value])),
  );
}
export function log(level:Level,event:string,fields:Record<string,unknown>={}){const entry={timestamp:new Date().toISOString(),level,event,...redact(fields)};const line=JSON.stringify(entry);if(level==="error")console.error(line);else if(level==="warn")console.warn(line);else console.info(line);}
