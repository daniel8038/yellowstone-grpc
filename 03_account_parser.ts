import Client, {
  CommitmentLevel,
  SubscribeRequest,
} from "@triton-one/yellowstone-grpc";
import { config } from "dotenv";
import base58 from "bs58";
import BN from "bn.js";
config();
const GRPC_URL = process.env.GRPC_URL!;

async function main() {
  const client = new Client(GRPC_URL, undefined, {
    "grpc.max_receive_message_length": 16 * 1024 * 1024,
  });
  const stream = await client.subscribe();

  const subscribeRequest: SubscribeRequest = {
    accounts: {
      txn: {
        account: ["8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj"],
        owner: ["CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"],
        filters: [],
        nonemptyTxnSignature: true,
      },
    },
    slots: {},
    transactions: {},
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    // accountsDataSlice: [],
    // 用于只读取账户数据中的特定片段，而不是整个数据。你需要知道数据的具体布局才能确定正确的偏移量。
    accountsDataSlice: [{ offset: "253", length: "16" }],
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
      const sqrtPriceX64Value = new BN(data.account.account.data, "le");
      console.log(`sqrtPriceX64Value----->`, sqrtPriceX64Value.toString());
      // 计算价格
      const sqrtPriceX64BigInt = BigInt(sqrtPriceX64Value.toString());
      const sqrtPriceX64Float = Number(sqrtPriceX64BigInt) / 2 ** 64;
      const price = (sqrtPriceX64Float ** 2 * 1e9) / 1e6;
      console.log(`WSOL价格:`, price.toString());
      console.log("---\n");
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
