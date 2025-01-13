class ScoreboardMaker {

    static async getImg(src) {
        return new Promise(resolve => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.src = src
        })
    }

    static drawLine(context, p1, p2, width=2, color="black") {
        context.beginPath()
        context.strokeStyle = color
        context.lineWidth = width
        context.moveTo(p1.x, p1.y)
        context.lineTo(p2.x, p2.y)
        context.stroke()
    }
    
    static async makeImg(players) {
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")

        const fontFamily = "Arial"
        const fontSize = 40
        context.font = `${fontSize}px ${fontFamily}`

        const tablePadding = 20
        const tableTopOffset = 25
        const rowHeight = 30
        
        const minNameWidth = context.measureText("00").width
        const nameWidths = players.map(p => Math.max(context.measureText(p.name).width, minNameWidth))
        const columnWidths = [context.measureText("000").width].concat(nameWidths)
        const columnXs = []
        const rowYs = []
        let sum = 0

        for (let i = 0; i < columnWidths.length; i++) {
            columnXs.push(sum + tablePadding)
            sum += columnWidths[i] + tablePadding * 2
        }

        const columnWidthSum = columnWidths.reduce((p, c) => p + c, 0)
        const imgWidth = columnWidthSum + columnWidths.length * 2 * tablePadding
        const imgHeight = (columnWidths.length + 1) * (rowHeight + tablePadding * 2)

        for (let i = 0; i < columnWidths.length + 1; i++) {
            rowYs.push(i * (rowHeight + tablePadding * 2) + tablePadding + tableTopOffset)
        }

        canvas.width = imgWidth
        canvas.height = imgHeight
        // for some reason font got reset after resizing canvas
        context.font = `${fontSize}px ${fontFamily}`
        context.fillStyle = "white"
        context.fillRect(0, 0, canvas.width, canvas.height)
        
        const tableContent = Array.from({length: rowYs.length})
            .map(() => Array.from({length: columnXs.length}, () => ""))

        tableContent[0][0] = "R#"
        for (let i = 0; i < players.length; i++) {
            tableContent[0][i + 1] = players[i].name
            tableContent[players.length + 1][i + 1] = players[i].score.toString()
            tableContent[i + 1][0] = "  " + (i + 1).toString()

            for (let r = 0; r < players[i].roundScores.length; r++) {
                const score = players[i].roundScores[r]
                tableContent[r + 1][i + 1] = score.toString()
            }
        }
        
        const tablePos = (r, c) => new Vector2d(columnXs[c], rowYs[r])
        window.tablePos = tablePos

        context.fillStyle = "black"
        for (let colIndex = 0; colIndex < columnXs.length; colIndex++) {
            for (let rowIndex = 0; rowIndex < rowYs.length; rowIndex++) {
                const pos = tablePos(rowIndex, colIndex)
                if (rowIndex == rowYs.length - 1) {
                    context.font = `bold ${fontSize}px ${fontFamily}`
                } else {
                    context.font = `${fontSize}px ${fontFamily}`
                }
                context.fillText(tableContent[rowIndex][colIndex], pos.x, pos.y)
            }
        }

        for (let i = 0; i < players.length - 1; i++) {
            this.drawLine(context,
                tablePos(i + 1, 1).addY(tablePadding).addX(-tablePadding),
                tablePos(i + 1, players.length).addY(tablePadding)
                    .addX(columnWidths[players.length]), 2, "#ccc")
                    
            this.drawLine(context,
                tablePos(1, i + 2).addX(-tablePadding).addY(-rowHeight - tablePadding),
                tablePos(players.length, i + 2).addX(-tablePadding)
                    .addY(tablePadding * 2 + rowHeight), 2, "#ccc")
        }

        this.drawLine(context,
            tablePos(0, 0).addY(tablePadding),
            tablePos(0, players.length).addY(tablePadding)
                .addX(columnWidths[players.length]), 3)

        this.drawLine(context,
            tablePos(players.length, 0).addY(tablePadding),
            tablePos(players.length, players.length).addY(tablePadding)
                .addX(columnWidths[players.length]), 3)
        
        this.drawLine(context,
            tablePos(0, 1).addX(-tablePadding).addY(-rowHeight),
            tablePos(players.length, 1).addX(-tablePadding)
                .addY(tablePadding * 2 + rowHeight), 3)

        for (let i = 0; i < players.length; i++) {
        }


        return canvas.toDataURL()
    }

}