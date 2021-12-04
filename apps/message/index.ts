import { BotApp, BotEvent, cqMessage, name, listen, filter } from "/core.ts";

interface State {
  repeat: Record<number, { message: string; count: number; done?: boolean }>;
}

export default class App extends BotApp<State> {
  name = "消息与通知管理";
  description = "同意添加好友请求，发送群成员变动通知，响应特定消息";

  init() {
    this.state.repeat = {};
  }

  @name("复读")
  @listen("message.group")
  async onRepeat(e: BotEvent) {
    const repeat = this.state.repeat[e.data.group_id];
    if (!repeat) {
      this.state.repeat[e.data.group_id] = {
        message: e.data.raw_message,
        count: 1,
      };
    } else if (repeat.message !== e.data.raw_message) {
      delete this.state.repeat[e.data.group_id];
    } else {
      repeat.count++;
      if (!repeat.done && Math.random() < 1 - 1 / 1.4 ** repeat.count) {
        repeat.done = true;
        await e.reply(e.data.raw_message, { at_sender: false });
      }
    }
  }

  @name("复读-自身发送消息会打断复读")
  @listen("message_sent.group")
  onRepeatSelf(e: BotEvent) {
    const repeat = this.state.repeat[e.data.group_id];
    if (repeat && repeat.message !== e.data.raw_message) {
      delete this.state.repeat[e.data.group_id];
    }
  }

  @name("在吗")
  @listen("message")
  @filter(/^在吗?[？?]$/, { at: true })
  onPing(e: BotEvent) {
    return e.reply("在呀！");
  }

  @name("查看版本")
  @listen("message")
  @filter(/^version$|^查看版本$/, { at: true })
  onVersion(e: BotEvent) {
    return e.reply("deno_bot[v3.0.0.alpha16]源码版");
  }

  @name("老婆")
  @listen("message")
  @filter(/^老婆$/, { at: true })
  async onLaoPo(e: BotEvent) {
    const pic = await Deno.readFile(this.asset("laopo.jpg"));
    return e.reply(pic);
  }

  @name("自动同意好友申请")
  @listen("request.friend")
  onRequestFriend(e: BotEvent) {
    return e.operation({ approve: true });
  }

  @name("群成员增加时提示")
  @listen("notice.group_increase")
  async onGroupIncrease(e: BotEvent) {
    const { self_id: selfId, group_id: groupId, user_id: userId } = e.data;
    if (userId === selfId) return;
    await this.api.send_group_msg({
      group_id: groupId,
      message: cqMessage([{ type: "at", data: { qq: userId } }, "加入了群聊"]),
    });
  }

  @name("群成员减少时提示")
  @listen("notice.group_decrease")
  async onGroupDecrease(e: BotEvent) {
    const {
      self_id: selfId,
      sub_type: subType,
      group_id: groupId,
      operator_id: operatorId,
      user_id: userId,
    } = e.data;
    if (subType === "kick_me") return;
    if (subType === "leave" && userId === selfId) return;
    const { nickname } = await this.api.get_stranger_info({ user_id: userId });
    if (subType === "leave") {
      const message = `${nickname}（${userId}）主动退群了`;
      await this.api.send_group_msg({ group_id: groupId, message });
    }
    if (subType === "kick") {
      const { card, nickname: operatorNickname } =
        await this.api.get_group_member_info({
          group_id: groupId,
          user_id: operatorId,
        });
      const message = `${
        card || operatorNickname
      }（${operatorId}）将${nickname}（${userId}）踢出了群`;
      await this.api.send_group_msg({ group_id: groupId, message });
    }
  }
}
