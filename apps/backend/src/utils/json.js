export function enableBigIntJsonSerialization() {
  if (!BigInt.prototype.toJSON) {
    Object.defineProperty(BigInt.prototype, "toJSON", {
      value() {
        return this.toString();
      },
      configurable: true,
      writable: true
    });
  }
}