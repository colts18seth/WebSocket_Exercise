/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require('./Room');
const axios = require('axios')

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
    /** make chat: store connection-device, rooom */

    constructor(send, roomName) {
        this._send = send; // "send" function for this user
        this.room = Room.get(roomName); // room user will be in
        this.name = null; // becomes the username of the visitor

        console.log(`created chat in ${this.room.name}`);
    }

    /** send msgs to this client using underlying connection-send-function */

    send(data) {
        try {
            this._send(data);
        } catch {
            // If trying to send to a user fails, ignore it
        }
    }

    /** handle joining: add to room members, announce join */

    handleJoin(name) {
        this.name = name;
        this.room.join(this);
        this.room.broadcast({
            type: 'note',
            text: `${this.name} joined "${this.room.name}".`
        });
    }

    /** handle a chat: broadcast to room. */

    handleChat(text) {
        this.room.broadcast({
            name: this.name,
            type: 'chat',
            text: text
        });
    }

    async handleJoke() {
        try {
            await axios.get("https://icanhazdadjoke.com/", {
                headers: {
                    'Accept': 'text/plain'
                }
            }).then(res => {
                this._send(JSON.stringify({
                    name: this.name,
                    type: 'joke',
                    joke: res.data
                }))
            })

        }
        catch (e) {
            console.log(e)
        }
    }

    handleMembers() {
        let members = [];
        for (const member of this.room.members) {
            members.push(member.name)
        }
        this._send(JSON.stringify({
            type: 'members',
            members: members
        }));
    }

    /** Handle messages from client:
     *
     * - {type: "join", name: username} : join
     * - {type: "chat", text: msg }     : chat
     */

    handleMessage(jsonData) {
        let msg = JSON.parse(jsonData);

        if (msg.type === 'join') this.handleJoin(msg.name);
        else if (msg.type === 'chat' && msg.text.includes("/joke"))
            this.handleJoke();
        else if (msg.type === 'chat' && msg.text.includes("/members"))
            this.handleMembers();
        else if (msg.type === 'chat') this.handleChat(msg.text);
        else throw new Error(`bad message: ${msg.type}`);
    }

    /** Connection was closed: leave room, announce exit to others */

    handleClose() {
        this.room.leave(this);
        this.room.broadcast({
            type: 'note',
            text: `${this.name} left ${this.room.name}.`
        });
    }
}

module.exports = ChatUser;
