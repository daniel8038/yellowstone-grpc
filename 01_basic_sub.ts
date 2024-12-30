import Client, {
  CommitmentLevel,
  SubscribeRequest,
} from "@triton-one/yellowstone-grpc";
import { config } from "dotenv";

config();
const GRPC_URL = process.env.GRPC_URL!;
async function main() {
  console.log(GRPC_URL);
  const grpc_client = new Client(GRPC_URL, undefined, {
    "grpc.max_receive_message_length": 16 * 1024 * 1024,
  });
  const stream = await grpc_client.subscribe();
  const subscribe_request: SubscribeRequest = {
    // 账户订阅 订阅特定账户的更改
    accounts: {
      //   address: {
      //     encoding: "base64",
      //   },
    },
    // 区块槽位订阅
    slots: {
      slot: { filterByCommitment: true }, // 根据提交级别过滤槽位更新
    },
    // 交易相关订阅
    transactions: {},
    //  // 订阅交易状态更新
    transactionsStatus: {},
    blocks: {},
    // 订阅区块元数据
    blocksMeta: {},
    // 订阅账本条目
    entry: {},
    // 账户数据切片订阅
    accountsDataSlice: [],
    // 提交级别设置
    // PROCESSED - 最快，但可能回滚
    // CONFIRMED - 较快，有一定确认
    // FINALIZED - 最慢，但最终确认
    commitment: CommitmentLevel.PROCESSED,
  };
  await new Promise<void>((resolve, reject) => {
    stream.write(subscribe_request, (err: any) => {
      if (err === null || err === undefined) {
        resolve();
      } else {
        reject();
      }
    });
  }).catch((err) => {
    console.log("--[sub]--", err);
    throw err;
  });
  stream.on("data", (data) => {
    console.log("--[data]--", data);
  });
  // ping pong
  const ping_request: SubscribeRequest = {
    accounts: {},
    slots: {},
    transactions: {},
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    accountsDataSlice: [],
    //
    ping: { id: 1 },
  };
  setInterval(async () => {
    await new Promise<void>((resolve, reject) => {
      stream.write(ping_request, (err: any) => {
        if (err === null || err === undefined) {
          resolve();
        } else {
          reject();
        }
      });
    }).catch((err) => {
      console.log("--[ping]--", err);
      throw err;
    });
  }, 5000);
}
main();
