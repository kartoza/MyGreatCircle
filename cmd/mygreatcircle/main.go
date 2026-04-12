package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/kartoza/MyGreatCircle/internal/api"
)

var Version = "dev"

func main() {
	port := flag.Int("port", 8080, "Server port")
	webDir := flag.String("web", "web/dist", "Directory for static web files")
	version := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *version {
		fmt.Printf("mygreatcircle %s\n", Version)
		os.Exit(0)
	}

	server := api.NewServer(*port, *webDir)

	log.Printf("MyGreatCircle %s starting on http://localhost:%d", Version, *port)
	if err := server.Start(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
