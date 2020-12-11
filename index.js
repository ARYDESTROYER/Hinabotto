const { create, Client } = require('@open-wa/wa-automate')
const welcome = require('./lib/welcome')
const left = require('./lib/left')
const msgHandler = require('./tobz')
const options = require('./options')
const fs = require('fs-extra')
const figlet = require('figlet')

const adminNumber = JSON.parse(fs.readFileSync('./lib/admin.json'))
const setting = JSON.parse(fs.readFileSync('./lib/setting.json'))
const isWhite = (chatId) => adminNumber.includes(chatId) ? true : false

let { 
    limitCount,
    memberLimit, 
    groupLimit,
    mtc: mtcState,
    banChats,
    restartState: isRestart
    } = setting

function restartAwal(tobz){
    setting.restartState = false
    isRestart = false
    tobz.sendText(setting.restartId, 'Restart was succesful!')
    setting.restartId = 'undefined'
    //fs.writeFileSync('./lib/setting.json', JSON.stringify(setting, null,2));
}

const start = async (tobz = new Client()) => {
        console.log('------------------------------------------------')
        console.log(color(figlet.textSync('HINA', { horizontalLayout: 'full' })))
        console.log('------------------------------------------------')
        console.log('[DEV] Ary')
        console.log('[SERVER] Server Started!')
        if(isRestart){restartAwal(tobz);}
        // Force it to keep the current session
        tobz.onStateChanged((state) => {
            console.log('[Client State]', state)
            if (state === 'CONFLICT' || state === 'UNLAUNCHED') tobz.forceRefocus()
        })
        // listening on message
        tobz.onMessage((async (message) => {

            tobz.getAllChats()
            .then((msg) => {
                if (msg >= 200) {
                    tobz.deleteChat()
                }
            })
            msgHandler(tobz, message)
        }))
           

        tobz.onGlobalParicipantsChanged((async (heuh) => {
            await welcome(tobz, heuh) 
            left(tobz, heuh)
            }))
        
        tobz.onAddedToGroup(async (chat) => {
            if(isWhite(chat.id)) return tobz.sendText(chat.id, 'Greetings, my name is Hina. Type "#help" to see usable commands.')
            if(mtcState === false){
                const groups = await tobz.getAllGroups()
                // BOT group count less than
                if(groups.length > groupLimit){
                    await tobz.sendText(chat.id, 'Sorry, the bot has joined the maximum number of group chats. Trying later may work.').then(async () =>{
                        tobz.deleteChat(chat.id)
                        tobz.leaveGroup(chat.id)
                    })
                }else{
                    if(chat.groupMetadata.participants.length < memberLimit){
                        await tobz.sendText(chat.id, `Your group currently has ${totalMem}, your group must atleast have ${memberLimit} members for the bot services to be activated. `).then(async () =>{
                            tobz.deleteChat(chat.id)
                            tobz.leaveGroup(chat.id)
                        })
                    }else{
                        if(!chat.isReadOnly) tobz.sendText(chat.id, 'Greetings, my name is Hina. Type "#help" to see usable commands.')
                    }
                }
            }else{
                await tobz.sendText(chat.id, 'Hina is under maintanance, trying later may work :)').then(async () => {
                    tobz.deleteChat(chat.id)
                    tobz.leaveGroup(chat.id)
                })
            }
        })

        /*tobz.onAck((x => {
            const { from, to, ack } = x
            if (x !== 3) tobz.sendSeen(to)
        }))*/

        // listening on Incoming Call
        tobz.onIncomingCall(( async (call) => {
            await tobz.sendText(call.peerJid, 'I cannot recieve phone calls, your number has been blocked. To unblock')
            .then(() => tobz.contactBlock(call.peerJid))
        }))
    }

create(options(true, start))
    .then(tobz => start(tobz))
    .catch((error) => console.log(error))
