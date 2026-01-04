import sys
import os
from PyQt6 import QtWidgets, QtGui, QtCore

app = QtWidgets.QApplication(sys.argv)

bg_path = os.path.abspath("static/assets/backgrounds/grey_50_transparent.png")
gif_path = os.path.abspath("static/assets/backgrounds/loading_spinner.gif")

# Main overlay window
window = QtWidgets.QWidget()
window.setWindowFlags(
    QtCore.Qt.WindowType.FramelessWindowHint |
    QtCore.Qt.WindowType.WindowStaysOnTopHint |
    QtCore.Qt.WindowType.Tool
)
window.setAttribute(QtCore.Qt.WidgetAttribute.WA_TranslucentBackground)

screen = app.primaryScreen()
screen_geometry = screen.geometry()
window.setGeometry(screen_geometry)

# Absolute positioning (no layouts)
# ----- Background -----
bg_label = QtWidgets.QLabel(window)
bg_label.setPixmap(QtGui.QPixmap(bg_path))
bg_label.setGeometry(0, 0, screen_geometry.width(), screen_geometry.height())

# ----- Spinner -----
spinner_label = QtWidgets.QLabel(window)
spinner_label.setGeometry(0, 0, screen_geometry.width(), screen_geometry.height())
spinner_label.setAlignment(QtCore.Qt.AlignmentFlag.AlignCenter)

movie = QtGui.QMovie(gif_path)
spinner_label.setMovie(movie)
movie.start()

window.showFullScreen()

QtCore.QTimer.singleShot(5000, app.quit)

app.exec()

