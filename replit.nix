{pkgs}: {
  deps = [
    pkgs.xdg-utils
    pkgs.alsa-lib
    pkgs.dbus
    pkgs.nss
    pkgs.nspr
    pkgs.cups
    pkgs.at-spi2-atk
    pkgs.atk
    pkgs.cairo
    pkgs.pango
    pkgs.mesa
    pkgs.libdrm
    pkgs.libxkbcommon
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.chromium
    pkgs.firefox-esr
    pkgs.postgresql
    pkgs.jq
  ];
}
