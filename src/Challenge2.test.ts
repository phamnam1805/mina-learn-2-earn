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

// 50 msgs, It takes about 1200 seconds to run on my computer - Macbook Pro M2 Pro
const dataset3 = [
    [151, 2870, 10258, 8223, 21351],
    [152, 2191, 1962, 19515, 23677],
    [153, 537, 9566, 16528, 26641],
    [154, 1143, 5146, 10436, 16725],
    [155, 1585, 5547, 12789, 19921],
    [156, 746, 12214, 5413, 18373],
    [157, 265, 14827, 18282, 33374],
    [158, 1624, 4088, 11091, 16803],
    [159, 2642, 7591, 13794, 24027],
    [160, 2240, 13474, 15625, 31347],
    [161, 2448, 1231, 16797, 20483],
    [162, 1846, 2397, 6423, 10676],
    [163, 1696, 11604, 13946, 27246],
    [164, 356, 9717, 14535, 24608],
    [165, 2405, 10978, 6566, 19952],
    [166, 278, 9632, 12543, 22457],
    [167, 555, 3386, 9418, 13359],
    [168, 1986, 6673, 16737, 25396],
    [169, 322, 1555, 11158, 13035],
    [170, 115, 9598, 18332, 28047],
    [171, 2844, 736, 10344, 13924],
    [172, 2960, 6472, 11715, 21156],
    [173, 1305, 11840, 19498, 32643],
    [174, 1473, 3444, 7278, 12196],
    [175, 766, 11379, 8942, 21087],
    [176, 1477, 12887, 11896, 26260],
    [177, 305, 1146, 10589, 12040],
    [178, 1373, 1002, 10619, 12994],
    [179, 478, 4201, 17185, 21867],
    [180, 2725, 14306, 5215, 22256],
    [181, 497, 12153, 16369, 29019],
    [182, 1554, 14746, 18356, 34662],
    [183, 2336, 13820, 12743, 28899],
    [184, 769, 14188, 8700, 23657],
    [185, 1068, 6615, 13953, 21640],
    [186, 594, 900, 15238, 16732],
    [187, 2000, 2995, 8519, 13523],
    [188, 1682, 13643, 6893, 22221],
    [189, 198, 4337, 10409, 14944],
    [190, 1294, 426, 16277, 17999],
    [191, 1772, 2230, 17535, 21537],
    [192, 2287, 11032, 16239, 29558],
    [193, 897, 8030, 13954, 22881],
    [194, 1736, 7003, 9639, 18378],
    [195, 1042, 1847, 9189, 12086],
    [196, 1159, 7417, 14503, 23079],
    [197, 1953, 7993, 10300, 20246],
    [198, 869, 8891, 16038, 25798],
    [199, 2095, 7970, 18679, 28744],
    [200, 2431, 656, 17761, 20858],
];

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

    it('Run with dataset3', async () => {
        await localDeploy();
        let proof = await CheckBatchOfMessages.baseCase(
            zkApp.processedMessageNumber.get()
        );
        for (let i = 0; i < dataset3.length; i++) {
            const message = dataset3[i];
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
        expect(zkApp.processedMessageNumber.get()).toEqual(Field(199));
    });
});
