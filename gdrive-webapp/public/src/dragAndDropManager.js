export default class DragAndDropManager {
    constructor() {
        this.dropArea = document.getElementById('drop-area')
    }

    initialize() {
        this.disableDragNDropEvents()
        this.enableHighlightOnDrag()
    }

    // stoped on 01:14:00 / 02:08:33

    disableDragNDropEvents() {
        const events = [
            'dragenter', 'dragover',
            'dragleave', 'drop'
        ]

        const preventDefaults = (e) => {
            e.preventDefault()
            e.stopPropagation()
        }

        events.forEach(eventName => {
            this.dropArea.addEventListener(eventName, preventDefaults, false)
            document.body.addEventListener(eventName, preventDefaults, false);
        })
    }

    enableHighlightOnDrag() {
        const events = ['dragenter', 'dragover']
        const highlight = (e) => {
            this.dropArea.classList.add('highlight')
            this.dropArea.classList.add("drop-area");
        }

        events.forEach(eventName => {
            this.dropArea.addEventListener(eventName, highlight, false)
        })
    }
}