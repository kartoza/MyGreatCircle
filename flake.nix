{
  description = "MyGreatCircle - Visualize your life journey as great circle arcs";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        version = "0.1.0";

        mygreatcircle = pkgs.buildGoModule {
          pname = "mygreatcircle";
          inherit version;
          src = ./.;
          vendorHash = null;

          ldflags = [
            "-s" "-w"
            "-X main.Version=${version}"
          ];

          meta = with pkgs.lib; {
            description = "Visualize your life journey as great circle arcs";
            homepage = "https://github.com/kartoza/MyGreatCircle";
            license = licenses.mit;
            maintainers = [ ];
          };
        };

      in {
        packages = {
          default = mygreatcircle;
          mygreatcircle = mygreatcircle;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Go
            go
            gopls
            gotools
            go-tools
            golangci-lint

            # Node (npm is bundled with nodejs)
            nodejs_22

            # Documentation
            python312
            python312Packages.mkdocs
            python312Packages.mkdocs-material

            # Tools
            git
            jq
            curl
          ];

          shellHook = ''
            echo "MyGreatCircle development environment"
            echo "Go: $(go version)"
            echo "Node: $(node --version)"
            echo ""
            echo "Commands:"
            echo "  make dev     - Start backend + frontend"
            echo "  make test    - Run tests"
            echo "  make build   - Build production binary"
          '';
        };

        apps = {
          default = {
            type = "app";
            program = "${mygreatcircle}/bin/mygreatcircle";
          };
        };
      }
    );
}
