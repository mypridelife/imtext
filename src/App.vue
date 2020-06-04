<template>
  <div id="app">
    <div class="notlogin-container" v-if="!isLogin">
      <input
        v-model="userNo"
        @keyup.enter="handleLogin"
        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        placeholder="Username"
        type="text"
      />
      <button
        @click="handleLogin"
        class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center justify-center w-full mt-4"
      >
        Login
      </button>
      <div class="error-info text-red-800 mt-4">
        {{ baseData.message }}
      </div>
    </div>
    <div v-else class="login-container">
      <div class="message-list">
        <div class="list">
          <div v-for="(item, index) in messageList" :key="index" class="msg">
            {{ item.nick }}:
            {{ item.payload.text }}
          </div>
        </div>
      </div>
      <div class="send-message">
        <input
          v-model="userMsg"
          @keyup.enter="handleTimSend"
          class="u-input shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none "
          placeholder="Username"
          type="text"
        />
        <button
          @click="handleTimSend"
          class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center justify-center ml-2"
        >
          Send
        </button>
      </div>
      <div class="user-info mt-4  flex items-center">
        <img :src="userInfo.avatar" class="w-10" />
        <div class="user-avater ml-4 text-gray-800 font-bold">
          {{ userInfo.nickname }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import TIM from 'tim-js-sdk'
import COS from 'cos-js-sdk-v5'
export default {
  name: 'app',
  data() {
    return {
      //TODO 替换appID和groupID
      //IM
      tim: null,
      appID: '1400380117',
      groupID: '@TGS#aZSWUGQGK',
      nextReqMessageID: '',
      messageList: [],
      isCompleted: '',

      //用户登录
      userNo: '',

      //返回数据
      baseData: {},
      userInfo: {},

      //是否登录
      isLogin: false,

      //发送数据
      userMsg: '',
    }
  },
  components: {},
  created() {
    const that = this
    // 创建 SDK 实例，TIM.create() 方法对于同一个 SDKAppID 只会返回同一份实例
    let options = {
      SDKAppID: that.appID, // 接入时需要将0替换为您的即时通信应用的 SDKAppID
    }
    that.tim = TIM.create(options) // SDK 实例通常用 that.tim 表示
    // 设置 SDK 日志输出级别，详细分级请参考 setLogLevel 接口的说明
    that.tim.setLogLevel(0) // 普通级别，日志量较多，接入时建议使用
    that.tim.registerPlugin({ 'cos-js-sdk': COS })

    that.tim.on(TIM.EVENT.SDK_READY, function(event) {
      // SDK ready 后接入侧才可以调用 sendMessage 等需要鉴权的接口，否则会提示失败！
      // event.name - TIM.EVENT.SDK_READY
      console.log('sdk ready')
      that.handleTimUpdateMyProfile()
    })

    that.tim.on(TIM.EVENT.MESSAGE_RECEIVED, function(event) {
      // 收到推送的单聊、群聊、群提示、群系统通知的新消息，可通过遍历 event.data 获取消息列表数据并渲染到页面
      // event.name - TIM.EVENT.MESSAGE_RECEIVED
      // event.data - 存储 Message 对象的数组 - [Message]
      console.log('收到了还未解析的消息', event)

      const length = event.data.length
      let message
      for (let i = 0; i < length; i++) {
        // Message 实例的详细数据结构请参考 Message
        // 其中 type 和 payload 属性需要重点关注
        // 从v2.6.0起，AVChatRoom 内的群聊消息，进群退群等群提示消息，增加了 nick（昵称） 和 avatar（头像URL） 属性，便于接入侧做体验更好的展示
        // 前提您需要先调用 updateMyProfile 设置自己的 nick（昵称） 和 avatar（头像URL），请参考 updateMyProfile 接口的说明
        message = event.data[i]
        switch (message.type) {
          case TIM.TYPES.MSG_TEXT:
            // 收到了文本消息
            that._handleTextMsg(message)
            break
          case TIM.TYPES.MSG_CUSTOM:
            // 收到了自定义消息
            that._handleCustomMsg(message)
            break
          case TIM.TYPES.MSG_GRP_TIP:
            // 收到了群提示消息，如成员进群、群成员退群
            that._handleGroupTip(message)
            break
          case TIM.TYPES.MSG_GRP_SYS_NOTICE:
            // 收到了群系统通知，通过 REST API 在群组中发送的系统通知请参考 在群组中发送系统通知 API
            that._handleGroupSystemNotice(message)
            break
          default:
            break
        }
      }
    })
  },
  mounted() {},
  methods: {
    //TODO替换url
    //点击登录
    handleLogin() {
      const userNo = this.userNo
      localStorage.setItem('userNo', this.userNo)
      this.axios({
        method: 'get',
        url: '/imtext/login',
      }).then((response) => {
        this.baseData = response.data.datas
        this.userInfo = response.data.datas.user

        const data = {
          userID: this.userNo,
          userSig: this.baseData.sig,
        }
        this.handleTimLogin(data)
      })
    },
    //tim登录
    handleTimLogin(data) {
      console.log('tim 登录')

      let promise = this.tim.login(data)
      promise
        .then((imResponse) => {
          console.log(imResponse.data) // 登录成功
          this.isLogin = true
          this.handleTimJoinGroup()
        })
        .catch(function(imError) {
          console.warn('login error:', imError) // 登录失败的相关信息
        })
    },
    //tim更新用户名称头像
    handleTimUpdateMyProfile() {
      console.log('tim更新用户名称头像')

      let promise = this.tim.updateMyProfile({
        nick: this.userInfo.nickname,
        avatar: this.userInfo.avatar,
      })
      promise
        .then(function(imResponse) {
          console.log(imResponse.data) // 更新资料成功
          console.log('更新资料成功')
        })
        .catch(function(imError) {
          console.warn('updateMyProfile error:', imError) // 更新资料失败的相关信息
        })
    },
    //tim-加入群组
    handleTimJoinGroup() {
      console.log('tim 加入群组')

      // 匿名用户加入（无需登录，入群后仅能接收消息）
      let promise = this.tim.joinGroup({ groupID: this.groupID })
      promise
        .then(function(imResponse) {
          switch (imResponse.data.status) {
            case TIM.TYPES.JOIN_STATUS_WAIT_APPROVAL: // 等待管理员同意
              console.log('等待管理员同意')
              break
            case TIM.TYPES.JOIN_STATUS_SUCCESS: // 加群成功
              console.log('加群成功', imResponse.data.group) // 加入的群组资料
              break
            case TIM.TYPES.JOIN_STATUS_ALREADY_IN_GROUP: // 已经在群中
              console.log('已经在群中')
              break
            default:
              break
          }
        })
        .catch(function(imError) {
          console.warn('joinGroup error:', imError) // 申请加群失败的相关信息
        })
    },
    //tim发消息
    handleTimSend() {
      const that = this
      let message = this.tim.createTextMessage({
        to: that.groupID,
        conversationType: TIM.TYPES.CONV_GROUP,
        // 消息优先级，用于群聊（v2.4.2起支持）。如果某个群的消息超过了频率限制，后台会优先下发高优先级的消息，详细请参考 消息优先级与频率控制
        // 支持的枚举值：TIM.TYPES.MSG_PRIORITY_HIGH, TIM.TYPES.MSG_PRIORITY_NORMAL（默认）, TIM.TYPES.MSG_PRIORITY_LOW, TIM.TYPES.MSG_PRIORITY_LOWEST
        priority: TIM.TYPES.MSG_PRIORITY_NORMAL,
        payload: {
          text: that.userMsg,
        },
      })

      // 2. 发送消息
      let promise = that.tim.sendMessage(message)
      promise
        .then(function(imResponse) {
          // 发送成功
          console.log('发送消息成功', imResponse)
          that.messageList.push(imResponse.data.message)
        })
        .catch(function(imError) {
          // 发送失败
          console.warn('sendMessage error:', imError)
        })
    },

    _handleTextMsg(message) {
      // 详细数据结构请参考 TextPayload 接口的说明
      console.log(message) // 文本消息内容
      console.log('接受到了消息')

      this.messageList.push(message)
    },

    _handleCustomMsg(message) {
      // 详细数据结构请参考 CustomPayload 接口的说明
      console.log(message.payload)
    },
    _handleGroupTip(message) {
      console.log(message)
      // 详细数据结构请参考 GroupTipPayload 接口的说明
      switch (message.payload.operationType) {
        case TIM.TYPES.GRP_TIP_MBR_JOIN: // 有成员加群
          break
        case TIM.TYPES.GRP_TIP_MBR_QUIT: // 有群成员退群
          break
        case TIM.TYPES.GRP_TIP_MBR_KICKED_OUT: // 有群成员被踢出群
          break
        case TIM.TYPES.GRP_TIP_MBR_SET_ADMIN: // 有群成员被设为管理员
          break
        case TIM.TYPES.GRP_TIP_MBR_CANCELED_ADMIN: // 有群成员被撤销管理员
          break
        case TIM.TYPES.GRP_TIP_GRP_PROFILE_UPDATED: // 群组资料变更
          //从v2.6.0起支持群组自定义字段变更内容
          // message.payload.newGroupProfile.groupCustomField
          break
        case TIM.TYPES.GRP_TIP_MBR_PROFILE_UPDATED: // 群成员资料变更，例如群成员被禁言
          break
        default:
          break
      }
    },

    _handleGroupSystemNotice(message) {
      // 详细数据结构请参考 GroupSystemNoticePayload 接口的说明
      console.log(message.payload.userDefinedField) // 用户自定义字段。使用 RESTAPI 发送群系统通知时，可在该属性值中拿到自定义通知的内容。
      // 用 REST API 发送群系统通知请参考 在群组中发送系统通知 API
    },
  },
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.notlogin-container {
  position: relative;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 50px 20px;
}

.login-container {
  position: absolute;
  width: 100%;
  height: 100%;
}
.message-list {
  position: relative;
  top: 0;
  width: 100%;
  height: 80%;

  display: flex;
  justify-content: center;
  align-items: center;
}
.list {
  position: relative;
  width: 90%;
  height: 90%;
  border: 2px solid #dcdcdc;
  overflow: auto;
}
.send-message {
  position: absolute;
  bottom: 50px;

  width: 100%;

  display: flex;
  align-items: center;
  padding: 10px;
}
.u-input {
  flex: 1;
}
.user-info {
  position: absolute;
  bottom: 0;

  width: 100%;
  padding: 10px;
}
.user-avater {
  width: 100%;
  height: 40px;
  background-color: white;
  display: flex;
  align-items: center;
}
.msg {
  border-radius: 30px;
  border: 2px solid ghostwhite;
  background-color: black;
  color: white;
  margin-bottom: 10px;
}
</style>
