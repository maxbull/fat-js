const util = require('../util');
const constant = require('../constant');
const nacl = require('tweetnacl/nacl-fast').sign;
const fctAddressUtil = require('factom/src/addresses');
const fctIdentityUtil = require('factom-identity-lib/src/validation');

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
 * tx = new TransactionBuilder(testTokenChainId)
 * .coinbaseInput([10])
 * .output("FA3aECpw3gEZ7CMQvRNxEtKBGKAos3922oqYLcHQ9NqXHudC6YBM", [10])
 * .sk1("sk13Rp3LVmVvWqo8mff82aDJN2yNCzjUs2Zuq3MNQSA5oC5ZwFAuu")
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
 * .sk1("sk13Rp3LVmVvWqo8mff82aDJN2yNCzjUs2Zuq3MNQSA5oC5ZwFAuu")
 * .build();
 *
 * //You can also use external signatures (from hardware devices, etc):
 *
 * let keyPair = nacl.keyPair.fromSeed(fctAddrUtils.addressToKey("Fs1q7FHcW4Ti9tngdGAbA3CxMjhyXtNyB1BSdc8uR46jVUVCWtbJ"));
 * let pubaddr = fctAddrUtils.keyToPublicFctAddress(keyPair.publicKey);
 *
 * let unsignedTx = new TransactionBuilder(testTokenChainId)
 * .input(pubaddr, [10])
 * .output("FA3umTvVhkcysBewF1sGAMeAeKDdG7kTQBbtf5nwuFUGwrNa5kAr", [10])
 * .build();
 *
 * let extsig = nacl.detached(fctUtil.sha512(unsignedTx.getMarshalDataSig(0)), keyPair.secretKey);
 *
 * let signedTx = new TransactionBuilder(unsignedTx)
 * .pkSignature(keyPair.publicKey, extsig)
 * .build();
 */
class TransactionBuilder {

    /**
     * @constructor
     * @param {string} tokenChainId - 64 character Factom Chain ID of the token to build the transaction for
     */
    constructor(t) {
        if ( t instanceof (require('./Transaction')) ) {
            //support for external signatures
            //check if a coinbase transaction
            if ( Object.keys(t._inputs).find(address => address === constant.COINBASE_ADDRESS_PUBLIC) ) {
                this._id1 = t._id1
            } else {
                this._keys = t._keys
            }

            this._signatures = t._signatures;

            this._tokenChainId = t._tokenChainId;
            this._inputs = t._inputs;
            this._outputs = t._outputs;
            this._timestamp = t._timestamp;
            if ( t._metadata !== undefined ) {
                this._metadata = t._metadata;
            }
            if ( t._tokenMetadata !== undefined ) {
                this._tokenMetadata = t._tokenMetadata;
            }
        } else if (typeof t === 'string' || t instanceof String) {
            let tokenChainId = t;
            if (!tokenChainId || tokenChainId.length !== 64) throw new Error('Token chain ID must be a valid Factom chain ID');
            this._tokenChainId = tokenChainId;

            this._keys = [];
            this._inputs = {};
            this._outputs = {};
        }
        else{
            throw new Error('Constructor expects either a previously assembled unsigned Transaction or a string containing the token chain id.');
        }
    }

    /**
     * Set up a Factoid address input for the transaction
     * @method
     * @param {string} fs - The private Factoid address to use as the input of the transaction OR raw public key if supplying external signatures
     * @param {object[]} ids - The token ID ranges to send in the transaction
     * @returns {TransactionBuilder}
     */
    input(fs, ids) {

        if ( this._signatures !== undefined ) {
            throw new Error("Attempting to add new input, expecting signatures only")
        }

        //if this is setup as coinbase, prevent additional inputs
        if (Object.keys(this._inputs).find(address => address === constant.COINBASE_ADDRESS_PUBLIC)) throw new Error('Cannot add an additional input to a coinbase transaction');

        if (!util.validateNFIds(ids)) throw new Error("Invalid ID range: " + JSON.stringify(ids));

        //if it isn't a private address and instead a public address then, the fs should be a public key      
        if (fctAddressUtil.isValidPrivateAddress(fs)) { //first check to see if valid private address

            //check that outputs does not contain this address
            if (this._outputs[fctAddressUtil.getPublicAddress(fs)]) throw new Error("Input address already occurs in outputs");

            this._keys.push(nacl.keyPair.fromSeed(fctAddressUtil.addressToKey(fs)));
            this._inputs[fctAddressUtil.getPublicAddress(fs)] = ids;

        } else {

            // at this point the fs is should be the fa if we get this far
            let fa = fs;
            if ( !fctAddressUtil.isValidPublicFctAddress(fa) ) { //check to see if user passed in a public fct address
                throw new Error("Input address must be either a valid private Factoid address or a Factoid public address");
            }

            //check that outputs does not contain this address
            if (this._outputs[fa]) throw new Error("Input address already occurs in outputs");

            this._keys.push({pubaddr: fa, publicKey:undefined});
            this._inputs[fa] = ids;
        }
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
        if ( this._signatures !== undefined ) {
            throw new Error("Attempting to add new output, expecting signatures only")
        }
        if (!fctAddressUtil.isValidPublicFctAddress(fa)) throw new Error("Output address must be a valid public Factoid address");
        if (!util.validateNFIds(ids)) throw new Error("Invalid ID range: " + JSON.stringify(ids));

        //check that inputs does not contain this address
        if (this._inputs[fa]) throw new Error("Output address already occurs in inputs");

        this._outputs[fa] = ids;
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
    sk1(sk1) {
        if (!fctIdentityUtil.isValidSk1(sk1)) throw new Error("You must include a valid SK1 Key to sign a coinbase transaction");
        this._sk1 = sk1;
        return this;
    }

    /**
     * Set up the identity public key of the issuing identity in prep for an externally signed coinbase transaction
     * @method
     * @param {string} id1 - The ID1 public key string of the issuing identity, external signature will be required in second pass
     * @returns {TransactionBuilder}
     */
    id1(id1) {
        if ( this._signatures !== undefined ) {
            throw new Error("Attempting to add new ID1 key while expecting coinbase signature only.  Use id1Signature.")
        }

        this._id1 = util.extractIdentityPublicKey(id1);
        return this;
    }

    /**
     * Set up the identity signature of the issuing identity in prep for an externally signed coinbase transaction
     * @method
     * @param {string} id1pubkey - The ID1 public key string of the issuing identity, external signature expected.
     * @param {Buffer} signature - signature - Optional signature provided on second pass
     * @returns {TransactionBuilder}
     */
    id1Signature(id1pubkey, signature) {
        if ( this._id1 === undefined ) {
            throw new Error("Attempting to pass a signature for invalid coinbase transaction.")
        }
        if ( !this._id1.equals(Buffer.from(id1pubkey,'hex')) ) {
            throw new Error("ID1 Key is not equal coinbase ID1 Key requiring a signature");
        }

        this._signatures = [signature];
        return this;
    }

    /**
     * Set arbitrary metadata for the transaction
     * @method
     * @param {*} metadata - The metadata. Must be JSON stringifyable
     * @returns {TransactionBuilder}
     */
    metadata(metadata) {
        if ( this._signatures !== undefined ) {
            throw new Error("Attempting to add new metadata, expecting signatures only")
        }
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
        if ( this._signatures !== undefined ) {
            throw new Error("Attempting to add new token metadata, expecting signatures only")
        }
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
     * Add a public key and signature to the transaction. This is used only in the case of externally signed transactions (useful for hardware wallets).
     * Public Key's /signatures need to be added in the same order as their corresponding inputs.
     * @param {string|Array|Buffer} publicKey - FCT public key as hex string, uint8array, or buffer
     * @param {Buffer} signature - Signature 
     * @returns {TransactionBuilder} - TransactionBuilder instance.
     */
    pkSignature(publicKey, signature) {

        let pk = Buffer.from(publicKey,'hex');

        let fa = fctAddressUtil.keyToPublicFctAddress(pk);

        let index = Object.keys(this._inputs).findIndex( a => { return a === fa } );

        if ( index !== undefined ) {
            this._keys[index].publicKey = pk;
            this._signatures[index] = signature
        } else {
            throw new Error("Public Key (" + pk.toString('hex') + ") for provided signature not found in input list." )
        }
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
            if (!this._sk1 && !this._id1) throw new Error('You must include a valid issuer sk1 key to perform a coinbase transaction')
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

        if ( this._signatures !== undefined ) {
            for (let i = 0; i < this._signatures.length; ++i) {
                if ( this._signatures[i] === undefined ) {
                    throw new Error('Missing signatures: All inputs must have an associated signature')
                }
            }
        }

        return new (require('./Transaction'))(this);
    }
}

module.exports = TransactionBuilder;
