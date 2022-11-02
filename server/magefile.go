//go:build mage
// +build mage

package main

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/livekit/mageutil"
)

const (
	imageName    = "docker.io/livekit/dev"
	imageVersion = "lk-doom"
)

// Default target to run when none is specified
// If not set, running mage will list available targets
var Default = Build

func init() {
}

func Build() error {
	fmt.Println("building...")
	if err := os.MkdirAll("bin", 0755); err != nil {
		return err
	}
	cmd := exec.Command("go", "build", "-o", "bin/lk-doom", "pkg/main.go")
	mageutil.ConnectStd(cmd)
	if err := cmd.Run(); err != nil {
		return err
	}

	return nil
}

func PublishDocker() error {
	versionTag := fmt.Sprintf("%s:%v", imageName, imageVersion)
	latestTag := fmt.Sprintf("%s:latest", imageName)
	cmd := exec.Command("docker", "build", ".",
		"--platform", "amd64",
		"--tag", versionTag,
		"--tag", latestTag,
	)
	mageutil.ConnectStd(cmd)
	if err := cmd.Run(); err != nil {
		return err
	}

	cmd = exec.Command("docker", "push", versionTag)
	mageutil.ConnectStd(cmd)
	if err := cmd.Run(); err != nil {
		return err
	}

	cmd = exec.Command("docker", "push", latestTag)
	mageutil.ConnectStd(cmd)
	if err := cmd.Run(); err != nil {
		return err
	}

	return nil
}

// cleans up builds
func Clean() {
	fmt.Println("cleaning...")
	os.RemoveAll("bin")
}
