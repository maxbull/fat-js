/** Declaration file generated by dts-gen */

export class BaseTokenCLI {
    constructor(...args: any[]);

    getBalance(...args: any[]): void;

    getCLI(...args: any[]): void;

    getChainId(...args: any[]): void;

    getIssuance(...args: any[]): void;

    getStats(...args: any[]): void;

    getTransaction(...args: any[]): void;

    getTransactions(...args: any[]): void;

    sendTransaction(...args: any[]): void;

}

export class CLIBuilder {
    constructor(...args: any[]);

    build(...args: any[]): void;

    host(...args: any[]): void;

    password(...args: any[]): void;

    port(...args: any[]): void;

    protocol(...args: any[]): void;

    secure(...args: any[]): void;

    timeout(...args: any[]): void;

    username(...args: any[]): void;

}

export const constant: {
    COINBASE_ADDRESS_PRIVATE: string;
    COINBASE_ADDRESS_PUBLIC: string;
    FAT0: string;
    FAT1: string;
    RCD_TYPE_1: {
        "0": number;
        BYTES_PER_ELEMENT: number;
        asciiSlice: any;
        asciiWrite: any;
        base64Slice: any;
        base64Write: any;
        buffer: {
            byteLength: number;
            slice: any;
        };
        byteLength: number;
        byteOffset: number;
        compare: any;
        copy: any;
        copyWithin: any;
        entries: any;
        equals: any;
        every: any;
        fill: any;
        filter: any;
        find: any;
        findIndex: any;
        forEach: any;
        hexSlice: any;
        hexWrite: any;
        includes: any;
        indexOf: any;
        inspect: any;
        join: any;
        keys: any;
        lastIndexOf: any;
        latin1Slice: any;
        latin1Write: any;
        length: number;
        map: any;
        offset: number;
        parent: {
            byteLength: number;
            slice: any;
        };
        readDoubleBE: any;
        readDoubleLE: any;
        readFloatBE: any;
        readFloatLE: any;
        readInt16BE: any;
        readInt16LE: any;
        readInt32BE: any;
        readInt32LE: any;
        readInt8: any;
        readIntBE: any;
        readIntLE: any;
        readUInt16BE: any;
        readUInt16LE: any;
        readUInt32BE: any;
        readUInt32LE: any;
        readUInt8: any;
        readUIntBE: any;
        readUIntLE: any;
        reduce: any;
        reduceRight: any;
        reverse: any;
        set: any;
        slice: any;
        some: any;
        sort: any;
        subarray: any;
        swap16: any;
        swap32: any;
        swap64: any;
        toJSON: any;
        toLocaleString: any;
        toString: any;
        ucs2Slice: any;
        ucs2Write: any;
        utf8Slice: any;
        utf8Write: any;
        values: any;
        write: any;
        writeDoubleBE: any;
        writeDoubleLE: any;
        writeFloatBE: any;
        writeFloatLE: any;
        writeInt16BE: any;
        writeInt16LE: any;
        writeInt32BE: any;
        writeInt32LE: any;
        writeInt8: any;
        writeIntBE: any;
        writeIntLE: any;
        writeUInt16BE: any;
        writeUInt16LE: any;
        writeUInt32BE: any;
        writeUInt32LE: any;
        writeUInt8: any;
        writeUIntBE: any;
        writeUIntLE: any;
    };
};

export namespace FAT0 {
    class Issuance {
        constructor(...args: any[]);

        getChain(...args: any[]): void;

        getChainId(...args: any[]): void;

        getEntry(...args: any[]): void;

        getEntryhash(...args: any[]): void;

        getIssuerChainId(...args: any[]): void;

        getMetadata(...args: any[]): void;

        getSupply(...args: any[]): void;

        getSymbol(...args: any[]): void;

        getTimestamp(...args: any[]): void;

        getTokenId(...args: any[]): void;

        getType(...args: any[]): void;

    }

    class IssuanceBuilder {
        constructor(...args: any[]);

        build(...args: any[]): void;

        metadata(...args: any[]): void;

        supply(...args: any[]): void;

        symbol(...args: any[]): void;

    }

    class Transaction {
        constructor(...args: any[]);

        getChainId(...args: any[]): void;

        getEntry(...args: any[]): void;

        getEntryhash(...args: any[]): void;

        getInputs(...args: any[]): void;

        getMarshalDataSig(...args: any[]): void;

        getMetadata(...args: any[]): void;

        getOutputs(...args: any[]): void;

        getTimestamp(...args: any[]): void;

        isCoinbase(...args: any[]): void;

        validateSignatures(...args: any[]): void;

    }

    class TransactionBuilder {
        constructor(...args: any[]);

        build(...args: any[]): void;

        burnOutput(...args: any[]): void;

        coinbaseInput(...args: any[]): void;

        id1(...args: any[]): void;

        id1Signature(...args: any[]): void;

        input(...args: any[]): void;

        metadata(...args: any[]): void;

        output(...args: any[]): void;

        pkSignature(...args: any[]): void;

        sk1(...args: any[]): void;

    }

}

export namespace FAT1 {
    class Issuance {
        constructor(...args: any[]);

        getChain(...args: any[]): void;

        getChainId(...args: any[]): void;

        getEntry(...args: any[]): void;

        getEntryhash(...args: any[]): void;

        getIssuerChainId(...args: any[]): void;

        getMetadata(...args: any[]): void;

        getSupply(...args: any[]): void;

        getSymbol(...args: any[]): void;

        getTimestamp(...args: any[]): void;

        getTokenId(...args: any[]): void;

        getType(...args: any[]): void;

    }

    class IssuanceBuilder {
        constructor(...args: any[]);

        build(...args: any[]): void;

        metadata(...args: any[]): void;

        supply(...args: any[]): void;

        symbol(...args: any[]): void;

    }

    class Transaction {
        constructor(...args: any[]);

        getChainId(...args: any[]): void;

        getEntry(...args: any[]): void;

        getEntryhash(...args: any[]): void;

        getInputs(...args: any[]): void;

        getMarshalDataSig(...args: any[]): void;

        getMetadata(...args: any[]): void;

        getOutputs(...args: any[]): void;

        getTimestamp(...args: any[]): void;

        getTokenMetadata(...args: any[]): void;

        isCoinbase(...args: any[]): void;

        validateSignatures(...args: any[]): void;

    }

    class TransactionBuilder {
        constructor(...args: any[]);

        build(...args: any[]): void;

        burnOutput(...args: any[]): void;

        coinbaseInput(...args: any[]): void;

        id1(...args: any[]): void;

        id1Signature(...args: any[]): void;

        input(...args: any[]): void;

        metadata(...args: any[]): void;

        output(...args: any[]): void;

        pkSignature(...args: any[]): void;

        sk1(...args: any[]): void;

        tokenMetadata(...args: any[]): void;

    }

}

export namespace util {
    function countNFIds(ids: any): any;

    function createPublicIdentityAddr(prefix: any, idpk: any): any;

    function expandNFIds(ids: any): any;

    function extractIdentityPublicKey(id1: any): any;

    function getTokenChainId(tokenId: any, rootChainId: any): any;

    function reduceNFIds(ids: any): any;

    function validateNFIds(ids: any): any;

}

