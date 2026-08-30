/** Fake BroadcastChannel for jsdom — mimics spec delivery semantics. */
export class FakeChannel {
  static instances: FakeChannel[] = [];
  name: string;
  onmessage: ((e: { data: any }) => void) | null = null;
  constructor(name: string) { this.name = name; FakeChannel.instances.push(this); }
  postMessage(data: any) {
    // BroadcastChannel semantics: deliver to OTHER channels of same name, not self
    for (const c of FakeChannel.instances) {
      if (c !== this && c.name === this.name) c.onmessage?.({ data });
    }
  }
  addEventListener(_t: string, cb: (e: { data: any }) => void) { this.onmessage = cb; }
  removeEventListener() { this.onmessage = null; }
  close() { FakeChannel.instances = FakeChannel.instances.filter(c => c !== this); }
}
