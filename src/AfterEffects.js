import * as PIXI from 'pixi.js';
import * as element from './element';
import Asset        from './asset';
import AEDataLoader from './loader';

export default class AfterEffects extends PIXI.Container {
    constructor(jsonPath) {
        super();
        this.finder = new element.ElementFinder();
        if (!jsonPath) return;
        AEDataLoader.loadJSON(jsonPath).then((data) => {
            this.setup(data);
        }, (err) => {
            console.log(err);
        });
    }

    static fromData(data) {
        const ae = new AfterEffects();
        ae.setup(data);
        return ae;
    }

    setup(data) {
        this.width       = data.w;
        this.height      = data.h;
        this.totalFrame  = data.op;
        this.frameRate   = data.fr;
        this.version     = data.v;
        this.assets      = data.assets;
        this.layers      = data.layers;
        this.player      = new element.ElementPlayer(this.frameRate, this.totalFrame, (frame) => {
            this.updateWithFrame(frame);
        }, () => {
            this.emit('completed', this);
        });

        let layerIndexMap = {};
        this.layers.forEach((layer) => {
            layerIndexMap[layer.index] = layer;
        });

        this.layers.reverse().forEach((layer) => {
            layer.frameRate = this.frameRate;
            if (layer.hasMask) {
                if (!this.masks) this.masks = [];
                if (layer.isImageType()) return;
                const maskLayer = new element.MaskElement(layer);
                this.addChild(layer);
                layer.addChild(maskLayer);
                this.masks.push({
                    maskTargetLayer: layer,
                    maskLayer: maskLayer,
                });
            } else if (layer.hasParent) {
                const parentLayer = layerIndexMap[layer.parentIndex];
                parentLayer.addChild(layer);
            } else {
                this.addChild(layer);
            }
        });
        this.player.showFirstFrame();
    }

    find(name) {
        return this.finder.findByName(name, this);
    }

    updateMask(frame) {
        this.masks.forEach((maskData) => {
            let drawnMask = maskData.maskLayer.updateWithFrame(frame);
            if (drawnMask) {
                maskData.maskTargetLayer.mask = maskData.maskLayer;
            } else {
                maskData.maskTargetLayer.mask = null;
            }
        });
    }

    update(nowTime) {
        if (!this.layers) return;
        this.player.update(nowTime);
        this.layers.forEach((layer) => {
            layer.update(nowTime);
        });
    }

    updateWithFrame(frame) {
        if (this.masks) {
            this.updateMask(frame);
        }
        this.layers.forEach((layer) => {
            layer.updateWithFrame(frame);
        });
    }

    play(isLoop) {
        this.player.play(isLoop);
    }

    pause() {
        this.player.pause();
    }

    resume() {
        this.player.resume();
    }

    stop() {
        this.player.stop();
    }
}
