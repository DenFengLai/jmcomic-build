# -*- mode: python ; coding: utf-8 -*-

block_cipher = None


a = Analysis(
    [
        'entry/entry_jmcomic.py',
        'entry/entry_jmv.py',
    ],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe_jmcomic = EXE(
    pyz,
    [a.scripts[0]],
    a.binaries,
    a.datas,
    [],
    name='jmcomic',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

exe_jmv = EXE(
    pyz,
    [a.scripts[1]],
    a.binaries,
    a.datas,
    [],
    name='jmv',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)