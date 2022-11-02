package main

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go"

	"github.com/gorilla/websocket"
)

type SomeStruct struct {
	Room        string `json:"room"`
	GameStarted bool   `json:"gameStarted"`
}

// create map of clients websockets
var clients = make(map[uint32]*websocket.Conn)

var upgrader = websocket.Upgrader{} // use default options

var host = "https://dan.staging.livekit.cloud"
var apiKey = "APIdVQYDzMshqax"
var apiSecret = "toNltPyZ8xiRDzese7hbdKUd2S6lpfyrs0DiASgRfPuB"

var roomClient = lksdk.NewRoomServiceClient(host, apiKey, apiSecret)

var allConns map[uint32]*websocket.Conn

func randomString(length int) string {
	rand.Seed(time.Now().UnixNano())
	b := make([]byte, length)
	rand.Read(b)
	return fmt.Sprintf("%x", b)[:length]
}

func socketHandler(w http.ResponseWriter, r *http.Request) {
	s := strings.Split(r.URL.Path, "/")
	roomName := s[len(s)-1]
	fmt.Println("got socket for room " + roomName)
	// Upgrade our raw HTTP connection to a websocket based one
	upgrader.CheckOrigin = func(r *http.Request) bool { return true } // todo fix this
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("Error during connection upgradation:", err)
		return
	}
	defer conn.Close()

	// The event loop
	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("Error during message reading:", err)
			break
		}
		fmt.Println("Received: ", message, " of type ", messageType)

		to := message[0:4]
		from := message[4:8]

		// decode this on the receiving end
		fromA := binary.LittleEndian.Uint32(from)
		ToB := binary.LittleEndian.Uint32(to)

		//fmt.Println("from: ", string(from))
		//fmt.Println("to: ", string(to))
		//fmt.Println("clients size: ", len(clients))
		// add to clients map
		clients[fromA] = conn
		// check if to is in the map
		if _, ok := clients[ToB]; ok {
			// send message to to
			clients[ToB].WriteMessage(messageType, message[4:])
		} else {
			// write out error
			fmt.Println("ERROR: no client with id " + string(ToB))
		}

		// need to save these tt values (they are numerical)
		// then listen to data from the room, when you receive data, use the websocket to send it back to doom
		//
		//roomClient.SendData(context.Background(), &livekit.SendDataRequest{
		//	Room:            roomName,
		//		Data:            to,
		//	DestinationSids: []string{},
		//})
		/*err = conn.WriteMessage(messageType, message)
		if err != nil {
			log.Println("Error during message writing:", err)
			break
		}
		*/
	}
}

func newRoomHandler(w http.ResponseWriter, r *http.Request) {
	// create a new room

	roomName := randomString(10)
	log.Printf("creating room %s", roomName)

	// create a new room
	room, err := roomClient.CreateRoom(context.Background(), &livekit.CreateRoomRequest{
		Name: roomName,
	})

	if err != nil {
		log.Printf("error creating room: %v", err)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
	a := SomeStruct{
		Room:        room.Name,
		GameStarted: false,
	}
	json.NewEncoder(w).Encode(a)
}

func roomHandler(w http.ResponseWriter, r *http.Request) {
	// join an existing room
	fmt.Println("got room request")
	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
	a := SomeStruct{
		Room: "roomName",
	}
	json.NewEncoder(w).Encode(a)
}

func tokenHandler(w http.ResponseWriter, r *http.Request) {
	s := strings.Split(r.URL.Path, "/")
	roomName := s[len(s)-2]
	participantIdentity := s[len(s)-1]
	fmt.Printf("roomName: %s, participantIdentity: %s\n", roomName, participantIdentity)
	token, err := getJoinToken(roomName, participantIdentity)
	if err != nil {
		log.Printf("error creating token: %v", err)
		return
	}

	w.Header().Set("Content-Type", "application/json;charset=UTF-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(token)
}

func main() {
	fmt.Println("starting server")
	http.HandleFunc("/api/ws/", socketHandler)
	http.HandleFunc("/api/newroom", newRoomHandler)
	http.HandleFunc("/api/room/", roomHandler)
	http.HandleFunc("/api/token/", tokenHandler)
	log.Fatal(http.ListenAndServe("0.0.0.0:8001", nil))
}

func getJoinToken(room, identity string) (string, error) {
	at := auth.NewAccessToken(apiKey, apiSecret)
	grant := &auth.VideoGrant{
		RoomJoin: true,
		Room:     room,
	}
	at.AddGrant(grant).
		SetIdentity(identity).
		SetValidFor(time.Hour)

	return at.ToJWT()
}
