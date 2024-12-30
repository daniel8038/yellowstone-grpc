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
        accountInclude: ["ZDLFG5UNPzeNsEkacw9TdKHT1fBZCACfAQymjWnpcvg"],
        accountExclude: [],
        accountRequired: ["ZDLFG5UNPzeNsEkacw9TdKHT1fBZCACfAQymjWnpcvg"],
      },
    },
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    accountsDataSlice: [],
    commitment: CommitmentLevel.PROCESSED,
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
    if (data.transaction) {
      console.log("[slot]", data.transaction.slot);
      // console.log(data.transaction.transaction);
      // preTokenBalances：交易执行前的代币余额
      // postTokenBalances：交易执行后的代币余额
      // 余额对象的结构通常是：
      // {
      //   accountIndex: number,    // 账户在交易中的索引
      //   mint: string,           // 代币的 mint 地址
      //   owner: string,          // 代币账户的所有者
      //   uiTokenAmount: {
      //     amount: string,       // 原始数量
      //     decimals: number,     // 小数位数
      //     uiAmount: number      // 格式化后的数量
      //   }
      // }
      const message = data.transaction.transaction.transaction.message;
      const instructions = message.instructions;

      const accountKeys =
        data.transaction.transaction.transaction.message.accountKeys.map(
          (ak: any) => bs58.encode(ak)
        );
      console.log(accountKeys);
      instructions.forEach((value: any) => {
        const { programIdIndex, accounts, data } = value;
        console.log(accountKeys[programIdIndex]);
      });
      //   const isPump = accountKeys.some(
      //     (key: string) => key === "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
      //   );
      //   if (isPump) {
      //   }
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
