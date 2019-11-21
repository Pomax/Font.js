import { SimpleTable } from "../../simple-table.js";

/**
* The OpenType `prep` table.
*
* See https://docs.microsoft.com/en-us/typography/opentype/spec/prep
*/
class prep extends SimpleTable {
    constructor(dict, dataview) {
        const { p } =  super(dict, dataview);
    }
}

export { prep };
