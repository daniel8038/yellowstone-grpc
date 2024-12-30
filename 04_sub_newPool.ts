// newPool log topic: Program log: Instruction: InitializeMint2
import Client, {
  CommitmentLevel,
  SubscribeRequest,
} from "@triton-one/yellowstone-grpc";
import bs58 from "bs58";
import { config } from "dotenv";

config();
const GRPC_URL = process.env.GRPC_URL!;
async function main() {
  // 创建client

  const client = new Client(GRPC_URL, undefined, {
    "grpc.max_receive_message_length": 128 * 1024 * 1024, // 128MB
  });
  console.log("Subscribing to event stream...");

  // 创建订阅数据流
  const stream = await client.subscribe();

  // 创建订阅请求
  const request: SubscribeRequest = {
    accounts: {},
    slots: {},
    transactions: {
      txn: {
        vote: false,
        failed: false,
        signature: undefined,
        accountInclude: ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"],
        accountExclude: [],
        accountRequired: [],
      },
    },
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    accountsDataSlice: [],
    commitment: CommitmentLevel.PROCESSED, // 指定级别为processed
    ping: undefined,
  };

  // 发送订阅请求
  await new Promise<void>((resolve, reject) => {
    stream.write(request, (err: any) => {
      if (err === null || err === undefined) {
        resolve();
      } else {
        reject(err);
      }
    });
  }).catch((reason) => {
    console.error(reason);
    throw reason;
  });

  // 获取订阅数据
  stream.on("data", async (data) => {
    // 监听池子创建
    if (
      data.transaction &&
      data.transaction.transaction.meta.logMessages &&
      data.transaction.transaction.meta.logMessages.some((log: any) =>
        log.includes("Program log: Instruction: InitializeMint2")
      )
    ) {
      console.log(
        "[tokenAddress]",
        data.transaction.transaction.meta.postTokenBalances[0].mint
      );
      console.log(
        "[poolAddress]",
        data.transaction.transaction.meta.postTokenBalances[0].owner
      );
      console.log("slot:", data.transaction.slot);
      console.log(
        "signature:",
        bs58.encode(data.transaction.transaction.signature)
      );
      const accountKeys =
        data.transaction.transaction.transaction.message.accountKeys.map(
          (ak: any) => bs58.encode(ak)
        );
      console.log("signer:", accountKeys[0]);
      console.log(
        `tx: https://solscan.io/tx/${bs58.encode(
          data.transaction.transaction.signature
        )}`
      );
      console.log("---\n");
    }
  });

  // 为保证连接稳定，需要定期向服务端发送ping请求以维持连接
  const pingRequest: SubscribeRequest = {
    accounts: {},
    slots: {},
    transactions: {},
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    accountsDataSlice: [],
    commitment: undefined,
    ping: { id: 1 },
  };
  // 每5秒发送一次ping请求
  setInterval(async () => {
    await new Promise<void>((resolve, reject) => {
      stream.write(pingRequest, (err: any) => {
        if (err === null || err === undefined) {
          resolve();
        } else {
          reject(err);
        }
      });
    }).catch((reason) => {
      console.error(reason);
      throw reason;
    });
  }, 5000);
}

main();
