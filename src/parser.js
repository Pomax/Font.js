const startDate = (new Date(`1904-01-01T00:00:00+0000`)).getTime();

/**
 * Convert an array of uint8 char into a proper string.
 *
 * @param {uint8[]} data
 */
function asText(data) {
    return Array.from(data).map(v => String.fromCharCode(v)).join(``);
}

/**
    * A data parser for table data, with auto-advancing pointer.
    */
class Parser {
    constructor(name, dict, dataview) {
        this.name = name;
        this.length = dict.length;
        this.start = dict.offset;
        this.offset = 0;
        this.data = dataview;

        [   `getInt8`,
            `getUint8`,
            `getInt16`,
            `getUint16`,
            `getInt32`,
            `getUint32`,
            `getBigInt64`,
            `getBigUint64`
        ].forEach(name => {
            let fn = name.replace(/get(Big)?/,'').toLowerCase();
            let increment = parseInt(name.replace(/[^\d]/g,'')) / 8;
            Object.defineProperty(this, fn, {
                get: () => this.getValue(name, increment)
            });
        });
    }

    get currentPosition() {
        return this.start + this.offset;
    }

    set currentPosition(position) {
        this.start = position;
        this.offset = 0;
    }

    getValue(type, increment) {
        let pos = this.start + this.offset;
        this.offset += increment;
        try {
            return this.data[type](pos);
        } catch (e) {
            console.error(`parser`, type, increment, this);
            console.error(`parser`, this.start, this.offset);
            throw e;
        }
    }

    flags(n) {
        if (n === 8 || n === 16 || n === 32 || n === 64) {
            return this[`uint${n}`].toString(2).padStart(n,0).split(``).map(v => v==="1");
        }
        console.error(`Error parsing flags: flag types can only be 1, 2, 4, or 8 bytes long`);
        console.trace();
    }

    get tag() {
        const t = this.uint32;
        return asText([t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, t & 255]);
    }

    get fixed() {
        let major = this.uint16;
        let minor = Math.round(1000 * this.uint16/65356);
        return major + minor/1000;
    }

    get legacyFixed() {
        // Only used in the `maxp`, `post`, and `vhea` tables.
        let major = this.uint16;
        let minor = (this.uint16).toString(16).padStart(4,0);
        return parseFloat(`${major}.${minor}`);
    }

    get uint24() {
        // Why does DataView not have a 24 bit value getters?
        return (this.uint8 << 16) + (this.uint8 << 8) + (this.uint8);
    }

    get uint128() {
        // I have no idea why the variable uint128 was chosen over a
        // fixed-width uint32, but it was, and so we need to decode it.
        let value = 0;
        for (let i=0; i<5; i++) {
            let byte = this.uint8;
            value = (value * 128) + (byte & 127);
            if (byte < 128) break;
        }
        return value;
    }

    get longdatetime() {
        return new Date(startDate + 1000 * parseInt(this.int64.toString()));
    }

    // alias datatypes

    get fword() { return this.int16; }
    get ufword() { return this.uint16; }
    get offset16() { return this.uint16; }
    get offset32() { return this.uint32; }

    verifyLength() {
        if (this.offset != this.length) {
            console.error(`unexpected parsed table size (${this.offset}) for "${this.name}" (expected ${this.length})`);
        }
    }

    toBytes() {
        // Get the entire datablock out.
        const start = this.start + this.offset;
        const end = start + this.length;
        return this.data.buffer.slice(start, end);
    }
}

export { Parser };
