# Optional module for a NEW deployment; copy with ../scripts and compose.template.json.
{ config, lib, pkgs, ... }:
let
  cfg = config.services.karakeepKnowledge;
  scripts = ../scripts;
  replace = value:
    if builtins.isAttrs value then lib.mapAttrs (_: replace) value
    else if builtins.isList value then map replace value
    else if builtins.isString value then lib.replaceStrings
      [ "@CONFIG@" "@DATA@" "@PORT@" ]
      [ cfg.configDirectory cfg.dataDirectory (toString cfg.port) ] value
    else value;
  composeFile = pkgs.writeText "karakeep-compose.json"
    (builtins.toJSON (replace (builtins.fromJSON (builtins.readFile ./compose.template.json))));
  cli = pkgs.writeShellApplication {
    name = "karakeep-knowledge";
    runtimeInputs = [ pkgs.docker-client pkgs.docker-compose ];
    text = ''
      exec docker compose --project-name karakeep \
        --project-directory ${lib.escapeShellArg cfg.configDirectory} \
        --file ${composeFile} "$@"
    '';
  };
  mcp = pkgs.writeShellScriptBin "karakeep-mcp-local" ''
    exec ${pkgs.python3}/bin/python3 ${scripts}/mcp_launcher.py \
      --env-file ${lib.escapeShellArg "${cfg.configDirectory}/mcp.env"} \
      -- ${cfg.mcpPackage}/bin/karakeep-mcp
  '';
in {
  options.services.karakeepKnowledge = {
    enable = lib.mkEnableOption "local persistent Karakeep using the existing Docker engine";
    user = lib.mkOption { type = lib.types.str; description = "Existing local service owner."; };
    configDirectory = lib.mkOption {
      type = lib.types.str;
      default = "${config.users.users.${cfg.user}.home}/.config/karakeep";
    };
    dataDirectory = lib.mkOption {
      type = lib.types.str;
      default = "${config.users.users.${cfg.user}.home}/.local/share/karakeep";
    };
    port = lib.mkOption { type = lib.types.ints.between 1024 65535; default = 3000; };
    mcpPackage = lib.mkOption {
      type = lib.types.nullOr lib.types.package;
      default = null;
      description = "Optional pinned official package providing bin/karakeep-mcp.";
    };
  };
  config = lib.mkIf cfg.enable {
    assertions = [
      { assertion = config.virtualisation.docker.enable;
        message = "karakeepKnowledge requires the already-selected Docker engine."; }
      { assertion = lib.hasPrefix "/" cfg.configDirectory && lib.hasPrefix "/" cfg.dataDirectory;
        message = "Karakeep runtime directories must be absolute paths."; }
      { assertion = !(lib.hasPrefix "/nix/store" cfg.configDirectory || lib.hasPrefix "/nix/store" cfg.dataDirectory);
        message = "Karakeep credentials and data must stay outside the Nix store."; }
    ];
    environment.systemPackages = [ cli ] ++ lib.optional (cfg.mcpPackage != null) mcp;
    environment.etc."karakeep/compose.json".source = composeFile;
    systemd.services.karakeep-knowledge = {
      description = "Local Karakeep archive and search";
      wantedBy = [ "multi-user.target" ];
      wants = [ "network-online.target" ];
      requires = [ "docker.service" ];
      after = [ "docker.service" "network-online.target" ];
      partOf = [ "docker.service" ];
      restartTriggers = [ composeFile ];
      unitConfig.RequiresMountsFor = [ cfg.configDirectory cfg.dataDirectory ];
      # Missing state is a recovery/setup condition. Activation never generates secrets.
      preStart = ''
        test -r ${lib.escapeShellArg "${cfg.configDirectory}/karakeep.env"}
        test -r ${lib.escapeShellArg "${cfg.configDirectory}/meilisearch.env"}
        test -d ${lib.escapeShellArg "${cfg.dataDirectory}/data"}
        test -d ${lib.escapeShellArg "${cfg.dataDirectory}/meilisearch"}
      '';
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        User = cfg.user;
        SupplementaryGroups = [ "docker" ];
        UMask = "0077";
        ExecStart = "${cli}/bin/karakeep-knowledge up --detach --wait --wait-timeout 180";
        ExecStop = "${cli}/bin/karakeep-knowledge stop --timeout 60";
        TimeoutStartSec = 300;
        TimeoutStopSec = 90;
      };
    };
  };
}
