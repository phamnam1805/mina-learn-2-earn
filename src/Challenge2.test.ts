import {
    Field,
    Mina,
    PrivateKey,
    PublicKey,
    AccountUpdate,
    Provable,
    UInt32,
} from 'o1js';
import { Challenge2, CheckBatchOfMessages, MessageDetails } from './Challenge2';
import { ZkAppCache } from './Constants';

let proofsEnabled = true;

// [messageNumber, agentId, agentXLocation, agentYLocation, checkSum]
const dataset1 = [
    [1, 2520, 4721, 12477, 19718],
    [2, 1354, 12963, 5468, 19785],
    [3, 2270, 13445, 15638, 31358],
    [4, 2011, 7846, 5559, 15416],
    [5, 363, 6376, 13814, 20553],
];

const dataset2 = [
    [151, 1812, 5868, 10357, 18039],
    [152, 1529, 5567, 17149, 24245],
    [153, 2249, 2403, 19679, 24331],
    [154, 301, 2576, 9072, 11949],
    [155, 2352, 5958, 18386, 26696],
    [156, 1323, 13823, 14222, 29377],
];

const dataset3 = [];

describe('Challenge2', () => {
    let deployerAccount: PublicKey,
        deployerKey: PrivateKey,
        senderAccount: PublicKey,
        senderKey: PrivateKey,
        zkAppAddress: PublicKey,
        zkAppPrivateKey: PrivateKey,
        zkApp: Challenge2;

    beforeAll(async () => {
        if (proofsEnabled) {
            Provable.log(CheckBatchOfMessages.analyzeMethods());
            Provable.log(Challenge2.analyzeMethods());
            await CheckBatchOfMessages.compile({ cache: ZkAppCache });
            await Challenge2.compile({ cache: ZkAppCache });
        }
    });

    beforeEach(() => {
        const Local = Mina.LocalBlockchain({ proofsEnabled });
        Mina.setActiveInstance(Local);
        ({ privateKey: deployerKey, publicKey: deployerAccount } =
            Local.testAccounts[0]);
        ({ privateKey: senderKey, publicKey: senderAccount } =
            Local.testAccounts[1]);
        zkAppPrivateKey = PrivateKey.random();
        zkAppAddress = zkAppPrivateKey.toPublicKey();
        zkApp = new Challenge2(zkAppAddress);
    });

    async function localDeploy() {
        const txn = await Mina.transaction(deployerAccount, () => {
            AccountUpdate.fundNewAccount(deployerAccount);
            zkApp.deploy();
        });
        await txn.prove();
        // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
        await txn.sign([deployerKey, zkAppPrivateKey]).send();
    }

    it('generates and deploys the `Add` smart contract', async () => {
        await localDeploy();
        const processedMessageNumber = zkApp.processedMessageNumber.get();
        expect(processedMessageNumber).toEqual(Field(0));
    });

    it('Run with dataset1', async () => {
        await localDeploy();
        let proof = await CheckBatchOfMessages.baseCase(
            zkApp.processedMessageNumber.get()
        );
        for (let i = 0; i < dataset1.length; i++) {
            const message = dataset1[i];
            const messageNumber = Field(message[0]);
            const messageDetail = new MessageDetails({
                agentId: new UInt32(message[1]),
                agentXLocation: new UInt32(message[2]),
                agentYLocation: new UInt32(message[3]),
                checkSum: new UInt32(message[4]),
            });
            proof = await CheckBatchOfMessages.step(
                messageNumber,
                proof,
                messageDetail
            );
        }
        // check the proof
        const txn = await Mina.transaction(senderAccount, () => {
            zkApp.check(proof);
        });
        await txn.prove();
        await txn.sign([senderKey]).send();
        expect(zkApp.processedMessageNumber.get()).toEqual(Field(5));
    });

    it('Run with dataset2', async () => {
        await localDeploy();
        let proof = await CheckBatchOfMessages.baseCase(
            zkApp.processedMessageNumber.get()
        );
        for (let i = 0; i < dataset2.length; i++) {
            const message = dataset2[i];
            const messageNumber = Field(message[0]);
            const messageDetail = new MessageDetails({
                agentId: new UInt32(message[1]),
                agentXLocation: new UInt32(message[2]),
                agentYLocation: new UInt32(message[3]),
                checkSum: new UInt32(message[4]),
            });
            proof = await CheckBatchOfMessages.step(
                messageNumber,
                proof,
                messageDetail
            );
        }
        // check the proof
        const txn = await Mina.transaction(senderAccount, () => {
            zkApp.check(proof);
        });
        await txn.prove();
        await txn.sign([senderKey]).send();
        expect(zkApp.processedMessageNumber.get()).toEqual(Field(155));
    });
});
