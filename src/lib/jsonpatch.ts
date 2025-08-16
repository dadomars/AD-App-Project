// src/lib/jsonpatch.ts
export type PatchOp = { op: "add"|"replace"|"remove"|"test"|"copy"|"move"; path: string; from?: string; value?: any };

function splitPointer(ptr: string): string[] {
  if (!ptr || ptr === "/") return [];
  if (!ptr.startsWith("/")) throw new Error("JSON Pointer non valido");
  return ptr.slice(1).split("/").map(t => t.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function getParent(doc: any, parts: string[]) {
  let cur = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (Array.isArray(cur)) cur = cur[Number(key)];
    else {
      if (!(key in cur)) cur[key] = {};
      cur = cur[key];
    }
  }
  const last = parts[parts.length - 1];
  return { parent: cur, key: last };
}

export function applyPatch(doc: any, ops: PatchOp[]): any {
  const clone = structuredClone(doc);
  for (const op of ops) {
    const { parent, key } = getParent(clone, splitPointer(op.path));
    switch (op.op) {
      case "add": {
        const v = structuredClone(op.value);
        if (Array.isArray(parent)) {
          if (key === "-") parent.push(v);
          else parent.splice(Number(key), 0, v);
        } else parent[key] = v;
        break;
      }
      case "replace": {
        const v = structuredClone(op.value);
        if (Array.isArray(parent)) parent[Number(key)] = v;
        else parent[key] = v;
        break;
      }
      case "remove": {
        if (Array.isArray(parent)) parent.splice(Number(key), 1);
        else delete parent[key];
        break;
      }
      case "test": {
        const actual = Array.isArray(parent) ? parent[Number(key)] : parent[key];
        const expected = op.value;
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error("JSON Patch test fallito");
        }
        break;
      }
      case "copy": {
        if (!op.from) throw new Error("copy richiede 'from'");
        let src: any = clone;
        for (const p of splitPointer(op.from)) src = Array.isArray(src) ? src[Number(p)] : src[p];
        const v = structuredClone(src);
        if (Array.isArray(parent)) {
          if (key === "-") parent.push(v);
          else parent[Number(key)] = v;
        } else parent[key] = v;
        break;
      }
      case "move": {
        if (!op.from) throw new Error("move richiede 'from'");
        const fparts = splitPointer(op.from);
        const { parent: fp, key: fk } = getParent(clone, fparts);
        const moved = Array.isArray(fp) ? fp.splice(Number(fk), 1)[0] : (() => { const m = fp[fk]; delete fp[fk]; return m; })();
        if (Array.isArray(parent)) {
          if (key === "-") parent.push(moved);
          else parent[Number(key)] = moved;
        } else parent[key] = moved;
        break;
      }
      default:
        throw new Error("Operazione JSON Patch non supportata");
    }
  }
  return clone;
}
