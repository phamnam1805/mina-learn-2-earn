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
} from 'o1js';

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
                Field,
                Field,
                Field,
                Field,
            ],
            method(
                messageNumber: Field,
                earlierProof: SelfProof<Field, CheckBatchOfMessagesOutput>,
                agentId: Field,
                agentXLocation: Field,
                agentYLocation: Field,
                checkSum: Field
            ): CheckBatchOfMessagesOutput {
                earlierProof.verify();
                return Provable.if(
                    earlierProof.publicOutput.previousProcessedMessageNumber.greaterThan(
                        messageNumber
                    ),
                    earlierProof.publicOutput,
                    Provable.if(
                        agentId.equals(Field(0)),
                        new CheckBatchOfMessagesOutput({
                            currentProcessedMessageNumber:
                                earlierProof.publicOutput
                                    .currentProcessedMessageNumber,
                            previousProcessedMessageNumber: messageNumber,
                        }),
                        Provable.if(
                            agentId
                                .greaterThanOrEqual(Field(0))
                                .and(agentId.lessThanOrEqual(Field(3000)))
                                .and(
                                    agentXLocation.greaterThanOrEqual(Field(0))
                                )
                                .and(
                                    agentXLocation.lessThanOrEqual(Field(15000))
                                )
                                .and(agentYLocation.greaterThan(Field(5000)))
                                .and(
                                    agentYLocation.lessThanOrEqual(Field(20000))
                                )
                                .and(
                                    agentId
                                        .add(agentXLocation)
                                        .add(agentYLocation)
                                        .equals(checkSum)
                                )
                                .and(agentXLocation.lessThan(agentYLocation)),
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
                // if (
                //     earlierProof.publicOutput.previousProcessedMessageNumber
                //         .greaterThan(messageNumber)
                //         .equals(true)
                // ) {
                //     return earlierProof.publicOutput;
                // }
                // if (agentId.equals(Field(0)).equals(true)) {
                //     return new CheckBatchOfMessagesOutput({
                //         currentProcessedMessageNumber:
                //             earlierProof.publicOutput
                //                 .currentProcessedMessageNumber,
                //         previousProcessedMessageNumber: messageNumber,
                //     });
                // }
                // if (
                //     agentId
                //         .greaterThanOrEqual(Field(0))
                //         .and(agentId.lessThanOrEqual(Field(3000)))
                //         .and(agentXLocation.greaterThanOrEqual(Field(0)))
                //         .and(agentXLocation.lessThanOrEqual(Field(15000)))
                //         .and(agentYLocation.greaterThan(Field(5000)))
                //         .and(agentYLocation.lessThanOrEqual(Field(20000)))
                //         .and(
                //             agentId
                //                 .add(agentXLocation)
                //                 .add(agentYLocation)
                //                 .equals(checkSum)
                //         )
                //         .and(agentXLocation.lessThan(agentYLocation))
                //         .equals(true)
                // ) {
                //     return new CheckBatchOfMessagesOutput({
                //         currentProcessedMessageNumber:
                //             earlierProof.publicOutput
                //                 .currentProcessedMessageNumber,
                //         previousProcessedMessageNumber: messageNumber,
                //     });
                // }
                // return earlierProof.publicOutput;
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
