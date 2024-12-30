import Client, {
  CommitmentLevel,
  SubscribeRequest,
} from "@triton-one/yellowstone-grpc";
import { config } from "dotenv";
import base58 from "bs58";
config();
const GRPC_URL = process.env.GRPC_URL!;

async function main() {
  const client = new Client(GRPC_URL, undefined, {
    "grpc.max_receive_message_length": 16 * 1024 * 1024,
  });
  const stream = await client.subscribe();
  // 订阅pumpfun相关交易数据
  const subscribeRequest: SubscribeRequest = {
    accounts: {},
    slots: {},
    transactions: {
      testFilterName: {
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

    commitment: CommitmentLevel.PROCESSED,
  };
  await new Promise<void>((resolve, reject) => {
    stream.write(subscribeRequest, (err: any) => {
      if (err === null || err === undefined) {
        resolve();
      } else {
        reject();
      }
    });
  }).catch((err) => {
    console.error("------[sub]------", err);
    throw err;
  });
  stream.on("data", (data) => {
    if (data.account) {
      console.log("------------------------[data]------------------------");
      const filterTransaction = data.transaction.transaction;
      const signatures = base58.encode(filterTransaction.signature);
      console.log("[data:signatures]---->\n", signatures);

      const accountKeys =
        data.transaction.transaction.transaction.message.accountKeys.map(
          (ak: Buffer) => base58.encode(ak)
        );
      console.log("[data:accountKeys]---->\n", accountKeys);
      // const instructions =
      //   data.transaction.transaction.transaction.message.instructions;
      // console.log("[data:instructions]---->", instructions);
      // 日志
      console.log(
        "[data:log]---->\n",
        data.transaction.transaction.meta.logMessages
      );
    }
  });
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
      console.error("------[sub]------", reason);
      throw reason;
    });
  }, 5000);
}
main();
