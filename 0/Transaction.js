const nacl = require('tweetnacl/nacl-fast').sign;
const {Entry} = require('factom');
const fctAddressUtil = require('factom/src/addresses');
const fctUtil = require('factom/src/util');
const fctIdentityUtil = require('factom-identity-lib/src/validation');
const fctIdentityCrypto = require('factom-identity-lib/src/crypto');
const RCD_TYPE_1 = Buffer.from('01', 'hex');
const COINBASE_ADDRESS_PUBLIC = 'FA1zT4aFpEvcnPqPCigB3fvGu4Q4mTXY22iiuV69DqE1pNhdF2MC';
const COINBASE_ADDRESS_PRIVATE = 'Fs1KWJrpLdfucvmYwN2nWrwepLn8ercpMbzXshd1g8zyhKXLVLWj';

class TransactionBuilder {
    constructor(tokenChainId) {
        if (!tokenChainId || tokenChainId.length !== 64) throw new Error('Token chain ID must be a valid Factom chain ID');
        this._tokenChainId = tokenChainId;

        this._keys = [];
        this._inputs = {};
        this._outputs = {};
    }

    input(fs, amount) {

        //if this is setup as coinbase, prevent additional inputs
        if (fs !== COINBASE_ADDRESS_PRIVATE && Object.keys(this._inputs).find(address => address === COINBASE_ADDRESS_PUBLIC)) throw new Error('');

        if (!fctAddressUtil.isValidPrivateAddress(fs)) throw new Error("Input address must be a valid private Factoid address");
        if (isNaN(amount) || !Number.isInteger(amount) || amount < 1) throw new Error("Input amount must be a positive nonzero integer");

        this._keys.push(nacl.keyPair.fromSeed(fctAddressUtil.addressToKey(fs)));
        this._inputs[fctAddressUtil.getPublicAddress(fs)] = amount;
        return this;
    }

    coinbaseInput(amount) {
        if (this._inputs.length > 0) throw new Error('Coinbase transactions may only have a single input');

        this.input(COINBASE_ADDRESS_PRIVATE, amount);
        return this;
    }

    output(fa, amount) {
        if (!fctAddressUtil.isValidFctPublicAddress(fa)) throw new Error("Input address must be a valid public Factoid address");
        if (isNaN(amount) || !Number.isInteger(amount) || amount < 1) throw new Error("Input amount must be a positive nonzero integer");

        this._outputs[fa] = amount;
        return this;
    }

    setIssuerSK1(sk1) {
        if (!fctIdentityUtil.isValidSk1(sk1)) throw new Error("You must include a valid SK1 Key to sign a coinbase transaction");
        this._sk1 = sk1;
        return this;
    }

    build() {
        if (Object.keys(this._inputs).length === 0 || Object.keys(this._outputs).length === 0) throw new Error("Must have at least one input and one output");

        const inputSum = Object.values(this._inputs).reduce((amount, sum) => amount + sum, 0);
        const outputSum = Object.values(this._outputs).reduce((amount, sum) => amount + sum, 0);
        if (inputSum !== outputSum) throw new Error("Input and output amount sums must match (" + inputSum + " != " + outputSum + ")");

        if (Object.keys(this._inputs).find(address => address === COINBASE_ADDRESS_PUBLIC)) {
            if (!this._sk1) throw new Error('You must include a valid issuer sk1 key to perform a coinbase transaction')
        }

        return new Transaction(this);
    }
}

class Transaction {
    constructor(builder) {
        if (builder instanceof TransactionBuilder) {
            this._inputs = builder._inputs;
            this._outputs = builder._outputs;

            this._content = JSON.stringify({inputs: this._inputs, outputs: this._outputs}); //snapshot the tx object

            const unixSeconds = Math.round(new Date().getTime() / 1000);

            this._extIds = [unixSeconds.toString()];

            this._tokenChainId = builder._tokenChainId;

            //handle coinbase tx
            if (Object.keys(this._inputs).find(address => address === COINBASE_ADDRESS_PUBLIC)) {

                if (!builder._sk1) throw new Error("You must include a valid SK1 Key to sign a coinbase transaction");
                // this.extIds.push(fctIdentityCrypto.sign(builder._sk1, builder._tokenChainId + this.content));

                const index = Buffer.from('0');
                const timestamp = Buffer.from(unixSeconds.toString());
                const chainId = Buffer.from(builder._tokenChainId, 'hex');
                const content = Buffer.from(this._content);

                const key = nacl.keyPair.fromSeed(fctIdentityCrypto.extractSecretFromIdentityKey(builder._sk1));

                this._rcds = [Buffer.concat([RCD_TYPE_1, Buffer.from(key.publicKey)])];

                this._signatures = [nacl.detached(fctUtil.sha512(Buffer.concat([index, timestamp, chainId, content])), key.secretKey)];

                this._extIds.push(this._rcds[0]);
                this._extIds.push(this._signatures[0]);

            } else { //otherwise normal transaction
                this._rcds = builder._keys.map(key => Buffer.concat([RCD_TYPE_1, Buffer.from(key.publicKey)]));
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
        } else throw new Error('Transaction may only be instantiated by TransactionBuilder');

        Object.freeze(this);
    }

    getInputs() {
        return this._inputs;
    }

    getOutputs() {
        return this._outputs;
    }

    isCoinbase() {
        return Object.keys(this._inputs).find(address => address === COINBASE_ADDRESS_PUBLIC) !== undefined;
    }

    getEntry() {
        return Entry.builder()
            .chainId(this._tokenChainId)
            .extIds(this._extIds, 'utf8')
            .content(this._content, 'utf8')
            .build();
    }
}

module.exports = {
    Transaction,
    TransactionBuilder
};