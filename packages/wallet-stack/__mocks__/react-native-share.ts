const Share = {
  open: jest.fn().mockResolvedValue({ success: true, dismissedAction: false, message: '' }),
}

export default Share
