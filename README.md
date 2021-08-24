# DOM-Physics-Engine
Physics Engine using all DOM content tagged properly as Rigid Body elements


## Para realizar un Build del paquete de Box2D dentro de los libs
Hay que tener instalado emscripten (version 2.0.27)
	- Descarga de https://github.com/emscripten-core/emsdk/tree/2.0.27
	- Ejecutar wn WSL
		- emsdk install latest
		- emsdk activate latest
	```bash
	- source "/mnt/d/Environments/emsdk-main/emsdk_env.sh"
	```

Despues construir con
```bash
emmake make
```