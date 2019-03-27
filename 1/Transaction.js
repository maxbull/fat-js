const util = require('../util');
const constant = require('../constant');
const nacl = require('tweetnacl/nacl-fast').sign;
const {Entry} = require('factom');
const fctAddressUtil = require('factom/src/addresses');
const fctUtil = require('factom/src/util');
const fctIdentityUtil = require('factom-identity-lib/src/validation');
const fctIdentityCrypto = require('factom-identity-lib/src/crypto');

/**
 * Build & Model A FAT-1 Transaction
 * @alias TransactionBuilder1
 * @public
 * @class
 * @example
 * const TransactionBuilder = require('fat-js').FAT1.TransactionBuilder
 *
 * const tokenId = 'mytoken';
 * const tokenChainId = '013de826902b7d075f00101649ca4fa7b49b5157cba736b2ca90f67e2ad6e8ec';
 *
 * let tx = new TransactionBuilder(testTokenChainId)
 * .input("Fs1PkAEbmo1XNangSnxmKqi1PN5sVDbQ6zsnXCsMUejT66WaDgkm", [{min: 0, max: 3}, 150])
 * .output("FA3aECpw3gEZ7CMQvRNxEtKBGKAos3922oqYLcHQ9NqXHudC6YBM", [{min: 0, max: 3}, 150])
 * .build();
 *
 * //coinbase transaction
 * tx = new TransactionBuilder('013de826902b7d075f00101649ca4fa7b49b5157cba736b2ca90f67e2ad6e8ec')
 * .coinbaseInput([10])
 * .output("FA3aECpw3gEZ7CMQvRNxEtKBGKAos3922oqYLcHQ9NqXHudC6YBM", [10])
 * .setIssuerSK1("sk13Rp3LVmVvWqo8mff82aDJN2yNCzjUs2Zuq3MNQSA5oC5ZwFAuu")
 *  .build();
 *
 * //burn transaction
 * tx = new TransactionBuilder(testTokenChainId)
 * .input("Fs1PkAEbmo1XNangSnxmKqi1PN5sVDbQ6zsnXCsMUejT66WaDgkm", [{min: 0, max: 3}, 150])
 * .burnOutput([{min: 0, max: 3}, 150])
 * .build();
 *
 * //transaction metadata
 * tx = new TransactionBuilder(testTokenChainId)
 * .input("Fs1PkAEbmo1XNangSnxmKqi1PN5sVDbQ6zsnXCsMUejT66WaDgkm", [10])
 * .output("FA3aECpw3gEZ7CMQvRNxEtKBGKAos3922oqYLcHQ9NqXHudC6YBM", [10])
 * .metadata({type: 'fat-js test run', timestamp: new Date().getTime()})
 * .build();
 *
 * //NF token metadata
 * tx = new TransactionBuilder(testTokenChainId)
 * .coinbaseInput([10])
 * .output("FA3aECpw3gEZ7CMQvRNxEtKBGKAos3922oqYLcHQ9NqXHudC6YBM", [10])
 * .tokenMetadata([
 * {
 *     ids: [10],
 *     metadata: {type: 'fat-js test run', timestamp: new Date().getTime()},
 * }
 * ])
 * .setIssuerSK1("sk13Rp3LVmVvWqo8mff82aDJN2yNCzjUs2Zuq3MNQSA5oC5ZwFAuu")
 * .build();
 */
class TransactionBuilder {

    /**
     * @constructor
     * @param {string} tokenChainId - 64 character Factom Chain ID of the token to build the transaction for
     */
    constructor(tokenChainId) {
        if (!tokenChainId || tokenChainId.length !== 64) throw new Error('Token chain ID must be a valid Factom chain ID');
        this._tokenChainId = tokenChainId;

        this._keys = [];
        this._inputs = {};
        this._outputs = {};
    }

    /**
     * Set up a Factoid address input for the transaction
     * @method
     * @param {string} fs - The private Factoid address to use as the input of the transaction
     * @param {object[]} ids - The token ID ranges to send in the transaction
     * @returns {TransactionBuilder}
     */
    input(fs, ids) {

        //if this is setup as coinbase, prevent additional inputs
        if (Object.keys(this._inputs).find(address => address === constant.COINBASE_ADDRESS_PUBLIC)) throw new Error('Cannot add an additional input to a coinbase transaction');

        if (!fctAddressUtil.isValidPrivateAddress(fs)) throw new Error("Input address must be a valid private Factoid address");
        if (!util.validateNFIds(ids)) throw new Error("Invalid ID range: " + JSON.stringify(ids));

        this._keys.push(nacl.keyPair.fromSeed(fctAddressUtil.addressToKey(fs)));
        this._inputs[fctAddressUtil.getPublicAddress(fs)] = ids;
        return this;
    }

    /**
     * Set up a coinbase input for the transaction, which mints tokens
     * @method
     * @param {object[]} ids - The token ID ranges to mint in the transaction
     * @returns {TransactionBuilder}
     */
    coinbaseInput(ids) {
        if (this._inputs.length > 0) throw new Error('Coinbase transactions may only have a single input');

        this.input(constant.COINBASE_ADDRESS_PRIVATE, ids);
        return this;
    }

    /**
     * Set up a Factoid address output for the transaction
     * @method
     * @param {string} fa - The public Factoid address destination of the output
     * @param {object[]} ids - The token ID ranges to send to the output address
     * @returns {TransactionBuilder}
     */
    output(fa, ids) {
        if (!fctAddressUtil.isValidPublicFctAddress(fa)) throw new Error("Output address must be a valid public Factoid address");
        if (!util.validateNFIds(ids)) throw new Error("Invalid ID range: " + JSON.stringify(ids));

        // if (!Array.isArray(ids)) this._outputs[fa] = [ids];
        else this._outputs[fa] = ids;
        return this;
    }

    /**
     * Set up a burn output for the transaction, which will destroy tokens
     * @method
     * @param {object[]} ids - The token ID ranges to send to the output address
     * @returns {TransactionBuilder}
     */
    burnOutput(ids) {
        if (Object.keys(this._outputs).find(address => address === constant.COINBASE_ADDRESS_PUBLIC)) throw new Error('Cannot add a duplicate burn output to a burn transaction');
        this.output(constant.COINBASE_ADDRESS_PUBLIC, ids);
        return this;
    }

    /**
     * Set the SK1 private key of the token's issuing identity. Required for coinbase transactions
     * @method
     * @param {string} sk1 - The SK1 private key string of the issuing identity
     * @returns {TransactionBuilder}
     */
    setIssuerSK1(sk1) {
        if (!fctIdentityUtil.isValidSk1(sk1)) throw new Error("You must include a valid SK1 Key to sign a coinbase transaction");
        this._sk1 = sk1;
        return this;
    }

    /**
     * Set arbitrary metadata for the transaction
     * @method
     * @param {*} metadata - The metadata. Must be JSON stringifyable
     * @returns {TransactionBuilder}
     */
    metadata(metadata) {
        try {
            JSON.stringify(metadata)
        } catch (e) {
            throw new Error("Transaction metadata bust be a valid JSON object or primitive");
        }
        this._metadata = metadata;
        return this;
    }

    /**
     * Set arbitrary metadata for the transaction
     * @method
     * @param {*} tokenMetadata - The token metadata. Must follow the proper format. Must be JSON stringifyable
     * @returns {TransactionBuilder}
     */
    tokenMetadata(tokenMetadata) {

        if (!Array.isArray(tokenMetadata)) throw new Error('Token metadata must be an array');
        if (!tokenMetadata.every(meta => typeof meta === 'object' && Object.keys(meta).length === 2 && meta.ids !== undefined && meta.metadata !== undefined)) throw new Error('Every metadata range representation must have only keys ids(Array) and metadata(JSON stringifiable value)');

        const allIds = tokenMetadata.reduce((all, rangeMeta) => {
            return all.concat(rangeMeta.ids);
        }, []);

        if (!util.validateNFIds(allIds)) throw new Error('Invalid token metadata, must not contain any duplicates or overlapping ranges');

        this._tokenMetadata = tokenMetadata;
        return this;
    }

    /**
     * Build the transaction
     * @method
     * @returns {Transaction}
     */
    build() {
        if (Object.keys(this._inputs).length === 0 || Object.keys(this._outputs).length === 0) throw new Error("Must have at least one input and one output");

        if (Object.keys(this._inputs).find(address => address === constant.COINBASE_ADDRESS_PUBLIC)) {
            if (!this._sk1) throw new Error('You must include a valid issuer sk1 key to perform a coinbase transaction')
        }

        //evaluate the token ids in inputs/outputs. Should be the same set
        let allInputIds = [];
        Object.values(this._inputs).forEach(ids => allInputIds = allInputIds.concat(util.expandNFIds(ids)));
        allInputIds.sort();

        let allOutputIds = [];
        Object.values(this._outputs).forEach(ids => allOutputIds = allOutputIds.concat(util.expandNFIds(ids)));
        allOutputIds.sort();

        if (JSON.stringify(allInputIds) !== JSON.stringify(allOutputIds)) throw new Error('Input and output token IDS do not match');

        //restrict tokenmetadata to coinbase transactions
        if (this._tokenMetadata !== undefined && !Object.keys(this._inputs).find(address => address === constant.COINBASE_ADDRESS_PUBLIC)) throw new Error('You may only specify tokenmetadata for coinbase transactions');

        return new Transaction(this);
    }
}

/**
 * Model A signed or unsigned FAT-1 Transaction
 * @alias Transaction1
 * @protected
 * @class
 */
class Transaction {

    /**
     * @constructor
     * @param {(TransactionBuilder|object)} builder - Either a TransactionBuilder object or a FAT-0 transaction object content
     */
    constructor(builder) {
        if (builder instanceof TransactionBuilder) {
            this._inputs = builder._inputs;
            this._outputs = builder._outputs;
            this._metadata = builder._metadata;
            this._tokenMetadata = builder._tokenMetadata;

            this._content = JSON.stringify({
                inputs: this._inputs,
                outputs: this._outputs,
                metadata: this._metadata,
                tokenmetadata: this._tokenMetadata
            }); //snapshot the tx object

            const unixSeconds = Math.round(new Date().getTime() / 1000);
            this._timestamp = unixSeconds;

            this._extIds = [unixSeconds.toString()];

            this._tokenChainId = builder._tokenChainId;

            //handle coinbase tx
            if (Object.keys(this._inputs).find(address => address === constant.COINBASE_ADDRESS_PUBLIC)) {

                if (!builder._sk1) throw new Error("You must include a valid SK1 Key to sign a coinbase transaction");

                const index = Buffer.from('0');
                const timestamp = Buffer.from(unixSeconds.toString());
                const chainId = Buffer.from(builder._tokenChainId, 'hex');
                const content = Buffer.from(this._content);

                const key = nacl.keyPair.fromSeed(fctIdentityCrypto.extractSecretFromIdentityKey(builder._sk1));

                this._rcds = [Buffer.concat([constant.RCD_TYPE_1, Buffer.from(key.publicKey)])];

                this._signatures = [nacl.detached(fctUtil.sha512(Buffer.concat([index, timestamp, chainId, content])), key.secretKey)];

                this._extIds.push(this._rcds[0]);
                this._extIds.push(this._signatures[0]);

            } else { //otherwise normal transaction
                this._rcds = builder._keys.map(key => Buffer.concat([constant.RCD_TYPE_1, Buffer.from(key.publicKey)]));
                let sigIndexCounter = 0;
                this._signatures = builder._keys.map(key => {

                    const index = Buffer.from(sigIndexCounter.toString());
                    const timestamp = Buffer.from(unixSeconds.toString());
                    const chainId = Buffer.from(builder._tokenChainId, 'hex');
                    const content = Buffer.from(this._content);

                    sigIndexCounter++;
                    return nacl.detached(fctUtil.sha512(Buffer.concat([index, timestamp, chainId, content])), key.secretKey);
                });
                for (let i = 0; i < this._rcds.length; i++) {
                    this._extIds.push(this._rcds[i]);
                    this._extIds.push(this._signatures[i]);
                }
            }
        } else { //from object
            if (!builder.data.inputs) throw new Error("Valid FAT-1 transactions must include inputs");
            this._inputs = builder.data.inputs;

            if (!builder.data.outputs) throw new Error("Valid FAT-1 transactions must include outputs");
            this._outputs = builder.data.outputs;

            this._metadata = builder.data.metadata;

            this._entryhash = builder.entryhash;
            this._timestamp = builder.timestamp;        }

        Object.freeze(this);
    }

    /**
     * @method
     * @returns {object} - The transaction's inputs
     */
    getInputs() {
        return this._inputs;
    }

    /**
     * @method
     * @returns {object} - The transaction's outputs
     */
    getOutputs() {
        return this._outputs;
    }

    /**
     * @method
     * @returns {*} - The transaction's metadata (if present, undefined if not)
     */
    getMetadata() {
        return this._metadata;
    }

    /**
     * @method
     * @returns {object[]} - The token metadata (if present, undefined if not)
     */
    getTokenMetadata() {
        return this._tokenMetadata;
    }

    /**
     * @method
     * @returns {boolean} - Whether the transaction is a coinbase transaction or not
     */
    isCoinbase() {
        return Object.keys(this._inputs).find(address => address === constant.COINBASE_ADDRESS_PUBLIC) !== undefined;
    }

    /**
     * @method
     * @returns {Entry} - Get the Factom-JS Factom entry representation of the transaction, including extids & other signatures
     */
    getEntry() {
        if (!this._tokenChainId) throw new Error('Can only get a valid Factom entry for a transaction built using TransactionBuilder');

        return Entry.builder()
            .chainId(this._tokenChainId)
            .extIds(this._extIds, 'utf8')
            .content(this._content, 'utf8')
            .build();
    }

    /**
     * @method
     * @returns {string} - Get the Factom chain ID of the transaction's token. Returns undefined if the Transaction was constructed from an object
     */
    getTokenChainId() {
        return this._tokenChainId;
    }

    /**
     * @method
     * @returns {string} - Get the Factom entryhash of the transaction. Only defined if the Transaction was constructed from an object
     */
    getEntryhash() {
        return this._entryhash;
    }

    /**
     * @method
     * @returns {number} - Get the unix timestamp of when the Transaction was signed (locally built transactions) or committed to Factom (from RPC response JSON)
     */
    getTimestamp() {
        return this._timestamp;
    }
}

module.exports = {
    Transaction,
    TransactionBuilder
};