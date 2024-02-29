import {
    Field,
    SmartContract,
    state,
    State,
    method,
    Struct,
    ZkProgram,
    SelfProof,
    Void,
    Provable,
    Bool,
    UInt32,
} from 'o1js';

export class MessageDetails extends Struct({
    agentId: UInt32,
    agentXLocation: UInt32,
    agentYLocation: UInt32,
    checkSum: UInt32,
}) {}

export class CheckBatchOfMessagesOutput extends Struct({
    currentProcessedMessageNumber: Field,
    previousProcessedMessageNumber: Field,
}) {
    toFields(): Field[] {
        return [
            this.currentProcessedMessageNumber,
            this.previousProcessedMessageNumber,
        ];
    }

    static fromFields(fields: Field[]): CheckBatchOfMessagesOutput {
        return new CheckBatchOfMessagesOutput({
            currentProcessedMessageNumber: fields[0],
            previousProcessedMessageNumber: fields[1],
        });
    }
}

export const CheckBatchOfMessages = ZkProgram({
    name: 'CheckBatchOfMessages',
    publicOutput: CheckBatchOfMessagesOutput,
    publicInput: Field,
    methods: {
        baseCase: {
            privateInputs: [],
            method(
                currentProcessedMessageNumber: Field
            ): CheckBatchOfMessagesOutput {
                return new CheckBatchOfMessagesOutput({
                    currentProcessedMessageNumber:
                        currentProcessedMessageNumber,
                    previousProcessedMessageNumber:
                        currentProcessedMessageNumber,
                });
            },
        },
        step: {
            privateInputs: [
                SelfProof<Field, CheckBatchOfMessagesOutput>,
                MessageDetails,
            ],
            method(
                messageNumber: Field,
                earlierProof: SelfProof<Field, CheckBatchOfMessagesOutput>,
                messageDetails: MessageDetails
            ): CheckBatchOfMessagesOutput {
                earlierProof.verify();
                return Provable.if(
                    earlierProof.publicOutput.previousProcessedMessageNumber.greaterThan(
                        messageNumber
                    ),
                    earlierProof.publicOutput,
                    Provable.if(
                        messageDetails.agentId.equals(UInt32.zero),
                        new CheckBatchOfMessagesOutput({
                            currentProcessedMessageNumber:
                                earlierProof.publicOutput
                                    .currentProcessedMessageNumber,
                            previousProcessedMessageNumber: messageNumber,
                        }),
                        Provable.if(
                            messageDetails.agentId
                                .greaterThanOrEqual(UInt32.zero)
                                .and(
                                    messageDetails.agentId.lessThanOrEqual(
                                        new UInt32(3000)
                                    )
                                )
                                .and(
                                    messageDetails.agentXLocation.greaterThanOrEqual(
                                        UInt32.zero
                                    )
                                )
                                .and(
                                    messageDetails.agentXLocation.lessThanOrEqual(
                                        new UInt32(15000)
                                    )
                                )
                                .and(
                                    messageDetails.agentYLocation.greaterThan(
                                        new UInt32(5000)
                                    )
                                )
                                .and(
                                    messageDetails.agentYLocation.lessThanOrEqual(
                                        new UInt32(20000)
                                    )
                                )
                                .and(
                                    messageDetails.agentId
                                        .add(messageDetails.agentXLocation)
                                        .add(messageDetails.agentYLocation)
                                        .equals(messageDetails.checkSum)
                                )
                                .and(
                                    messageDetails.agentXLocation.lessThan(
                                        messageDetails.agentYLocation
                                    )
                                ),
                            new CheckBatchOfMessagesOutput({
                                currentProcessedMessageNumber:
                                    earlierProof.publicOutput
                                        .currentProcessedMessageNumber,
                                previousProcessedMessageNumber: messageNumber,
                            }),
                            earlierProof.publicOutput
                        )
                    )
                );
            },
        },
    },
});

export class CheckBatchOfMessagesProof extends ZkProgram.Proof(
    CheckBatchOfMessages
) {}

export class Challenge2 extends SmartContract {
    @state(Field) processedMessageNumber = State<Field>();

    init() {
        super.init();
        this.processedMessageNumber.set(Field(0));
    }

    @method check(proof: CheckBatchOfMessagesProof) {
        proof.verify();
        proof.publicOutput.currentProcessedMessageNumber.assertEquals(
            this.processedMessageNumber.getAndRequireEquals()
        );
        this.processedMessageNumber.set(
            proof.publicOutput.previousProcessedMessageNumber
        );
    }
}
