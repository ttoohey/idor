import crypto from "crypto";

export default function(opts) {
  const options = {
    salt: "",
    defaultScope: "public",
    cipher: "aes128",
    ...opts
  };

  function loadValueAndTypename(o) {
    try {
      const [value, typename] = unserialize(o.__buffer, o.__scope);
      o.__value = value;
      o.__typename = typename;
    } catch {
      return;
    }
  }

  function serialize([value, typename], scope) {
    const { cipher: cipherAlgorithm, salt } = options;
    let valueBuffer;
    if (typeof value === "string") {
      // uuid
      valueBuffer = Buffer.from(value.toLowerCase().replace(/-/g, ""), "hex");
    } else if (typeof value === "number" && value < 2 ** 32) {
      // unsigned int
      valueBuffer = Buffer.allocUnsafe(4);
      valueBuffer.writeUInt32BE(value, 0);
    }
    const valueLength = Buffer.allocUnsafe(1);
    valueLength.writeUInt8(valueBuffer.length);
    const typenameBuffer = Buffer.from(typename, "utf8");
    const cipher = crypto.createCipher(cipherAlgorithm, `${salt}:${scope}`);
    const buffer = Buffer.concat([
      cipher.update(valueLength),
      cipher.update(valueBuffer),
      cipher.update(typenameBuffer),
      cipher.final()
    ]);
    return buffer;
  }

  function unserialize(buffer, scope) {
    const { cipher: cipherAlgorithm, salt } = options;
    const decipher = crypto.createDecipher(cipherAlgorithm, `${salt}:${scope}`);
    const decrypted = Buffer.concat([
      decipher.update(buffer),
      decipher.final()
    ]);
    const valueLength = decrypted.readUInt8(0);
    const valueBuffer = decrypted.slice(1, 1 + valueLength);
    let value;
    if (valueLength === 4) {
      // unsigned int
      value = valueBuffer.readUInt32BE(0);
    } else if (valueLength === 16) {
      // uuid
      value = valueBuffer
        .toString("hex")
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
    }
    const typename = decrypted.slice(1 + valueLength).toString("utf8");
    return [value, typename];
  }

  return class Node {
    /**
     * The value and typename are packed into a buffer which is then
     * encrypted. The scope provides a part of the encryption key (the other part
     * is from the password set with .setPassword()).
     *
     * The value must be either an unsigned int (32 bit) or a UUID string.
     *
     * The typename should be a string that identifies the object class to which
     * the value belongs. If a value is provided, but typename is null, the
     * constructor class name will be used. This allows patterns like:
     *
     * ```
     * class MyType extends Node {}
     * class OtherType extends Node {}
     * new MyType(1).__typename === 'MyType'
     * new OtherType(1).__typename === 'OtherType'
     * ```
     *
     * If an Node instance is provided as the value parameter, the
     * instance is cloned.
     *
     * @param {mixed}   [value=null]    An unsigned int or UUID string
     * @param {string}  [typename=null] The object type
     * @param {scope}   [scope=null]    The encryption scope
     */
    constructor(value = null, typename = null, scope = null) {
      if (value === null) {
        this.__value = null;
        this.__typename = null;
        this.__scope = options.defaultScope;
        this.__buffer = null;
        return;
      }
      if (value instanceof Node) {
        this.__value = value.__value;
        this.__typename = value.__typename;
        this.__scope = value.__scope;
        this.__buffer = value.__buffer;
      } else {
        this.__value = value;
        this.__typename = typename || this.constructor.name;
        this.__scope = scope || options.defaultScope;
        this.__buffer = serialize(
          [this.__value, this.__typename],
          this.__scope
        );
      }
    }

    /**
     * Create a new instance from the public value
     *
     * @param  {string} string       A string created from .toString()
     * @param  {string} [scope=null] Set the encryption scope
     * @return {Node}                A new Node instance
     */
    static fromString(string, scope = null) {
      return new this()
        .fromString(string)
        .setScope(scope || options.defaultScope);
    }

    /**
     * Get the private value
     *
     * @return {number|string} An unsigned int or UUID string
     */
    valueOf() {
      if (this.__value === null) {
        return null;
      }
      return this.__value.valueOf();
    }

    /**
     * Get the public value
     *
     * @return {string} A Base64 encoded  string of the encryption buffer
     */
    toString() {
      if (this.__buffer === null) {
        return null;
      }
      return this.__buffer.toString("base64").replace(/=*$/, "");
    }

    /**
     * Alias of .valueOf() used by the Knex.js library
     *
     * @return {number|string} An unsigned int or UUID string
     */
    toPostgres() {
      return this.valueOf();
    }

    /**
     * Loads the value from a public string.
     *
     * @param  {string} string  A string created from .toString()
     * @return {Node}           The object instance for chaining
     */
    fromString(string) {
      this.__buffer = Buffer.from(string, "base64");
      this.__value = null;
      this.__typename = null;
      loadValueAndTypename(this);
      return this;
    }

    /**
     * Set the encryption scope. The existing buffer will be decrypted
     * using the new scope.
     *
     * This allows setting the scope on an instance separately from the
     * constructor.
     *
     *   const id = new Node(1)
     *   id.scope = 'private'
     *   const publicId = id.toString()
     *
     *   const id = Node.parse(publicId)
     *   id.scope = 'private'
     *   id.valueOf() === 1
     *
     * @param  {string} scope The new encryption scope
     * @return {Node}         This object instance for chaining
     */
    setScope(scope) {
      this.__scope = scope;
      loadValueAndTypename(this);
      if (this.__value !== null && this.__typename !== null) {
        this.__buffer = serialize(
          [this.__value, this.__typename],
          this.__scope
        );
      }
      return this;
    }
    set scope(scope) {
      this.setScope(scope);
    }

    /**
     * Getter to return the object's type name
     *
     * @return {string} The typename provided through the constructor
     */
    get typename() {
      return this.__typename;
    }
  };
}
