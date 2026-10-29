import { useEffect, useState } from 'react'
import { axiosInstance } from '../../lib/axios'
import { toast } from 'sonner'
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  TablePagination,
  Typography,
  Stack,
  Tooltip,
} from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import { Delete, Download } from '@mui/icons-material'
import { download } from '../../helper/download'
import { getTranscriptLinePlain } from '../../types/transcript'
import dayjs from 'dayjs'

type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  limit: number
}

const TABLE_COL_SPAN = 3

const getPreviewLines = (lines: AudioRecord['originalText']) => {
  if (!lines.length) return '-'

  return lines.slice(0, 3).map(getTranscriptLinePlain).join('\n')
}

const downloadButtonSx: SxProps<Theme> = {
  minWidth: 'auto',
  px: 1,
  py: 0.4,
  color: 'text.primary',
  borderColor: 'divider',
  textTransform: 'none',
  fontWeight: 400,
  fontSize: '0.8rem',
  lineHeight: 1.4,

  '& .MuiButton-endIcon': {
    ml: 0.5,
    mr: 0,
    color: 'inherit',
  },

  '& .MuiButton-endIcon svg': {
    color: 'inherit',
    fill: 'currentColor',
    fontSize: 18,
  },

  '&:hover': {
    borderColor: 'text.primary',
    bgcolor: 'action.hover',
  },
}

const deleteButtonSx: SxProps<Theme> = {
  p: 0.5,
  color: 'error.main',

  '& > .MuiSvgIcon-root': {
    color: 'inherit !important',
    fill: 'currentColor',
  },

  '&.Mui-disabled': {
    color: 'action.disabled',
  },

  '&:hover': {
    bgcolor: 'action.hover',
  },
}

const HistoryScreen = () => {
  const [data, setData] = useState<AudioRecord[]>([])
  const [recordToDelete, setRecordToDelete] = useState<AudioRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  const deleteRecord = async (recordId: string) => {
    try {
      setIsDeleting(true)

      await axiosInstance.delete(`/users/audioRecords/${recordId}`)

      setData(prev => prev.filter(record => record._id !== recordId))
      toast.success('Zapisk je zhašeny')
    } catch (err) {
      console.error(err)
      toast.error('Zmylk při zhašenju zapiska')
    } finally {
      setIsDeleting(false)
      setRecordToDelete(null)
    }
  }

  const onConfirmDelete = async () => {
    if (!recordToDelete) return

    await deleteRecord(recordToDelete._id)
    await getUsersHistory(page, rowsPerPage)
  }

  const getUsersHistory = async (nextPage = page, nextLimit = rowsPerPage) => {
    try {
      setIsLoading(true)

      const response = await axiosInstance.get<
        AudioRecord[] | PaginatedResponse<AudioRecord>
      >('/users/audioRecords', {
        params: {
          page: nextPage,
          limit: nextLimit,
        },
      })

      const payload = response.data

      if (Array.isArray(payload)) {
        setData(payload)
        setTotal(payload.length)
        setPage(0)
        return
      }

      setData(payload.items)
      setTotal(payload.total)
      setPage(payload.page)
      setRowsPerPage(payload.limit)
    } catch (err) {
      console.error(err)
      toast.error('Zmylk z twojej historiju')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getUsersHistory(page, rowsPerPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage])

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        px: {
          xs: 2,
          sm: 4,
          md: 10,
        },
        py: {
          xs: 2,
          sm: 3,
        },
      }}
    >
      <Typography variant='h5' component='h2' sx={{ mb: 2 }}>
        Historia
      </Typography>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          bgcolor: 'background.paper',
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Table
          size='small'
          sx={{
            width: '100%',
            minWidth: {
              xs: 620,
              sm: 760,
              md: 900,
            },
            tableLayout: 'fixed',

            '--history-date-col-width': '65px',
            '--history-actions-col-width': {
              xs: '260px',
              sm: '290px',
            },

            '& th, & td': {
              px: {
                xs: 0.75,
                sm: 1,
              },
              py: 1,
            },

            '& th': {
              color: 'text.primary',
              fontWeight: 600,
              bgcolor: 'background.default',
              borderColor: 'divider',
            },

            '& td': {
              color: 'text.primary',
              borderColor: 'divider',
              verticalAlign: 'top',
            },
          }}
        >
          <colgroup>
            <col style={{ width: 'var(--history-date-col-width)' }} />
            <col />
            <col style={{ width: 'var(--history-actions-col-width)' }} />
          </colgroup>

          <TableHead>
            <TableRow>
              <TableCell>Datum</TableCell>
              <TableCell>Original</TableCell>
              <TableCell
                align='center'
                sx={{
                  overflow: 'visible',
                  whiteSpace: 'nowrap',
                }}
              >
                Aktione
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={TABLE_COL_SPAN} align='center'>
                  <CircularProgress size={20} />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={TABLE_COL_SPAN} align='center'>
                  <Typography variant='body2' color='text.secondary'>
                    Žane zapiski namakane
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map(record => {
                const createdAt = record.createdAt
                  ? dayjs(record.createdAt)
                  : null

                const originalPreview = getPreviewLines(record.originalText)

                return (
                  <TableRow
                    key={record._id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': {
                        border: 0,
                      },
                    }}
                  >
                    <TableCell>
                      {createdAt ? (
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          <Typography
                            variant='body2'
                            sx={{
                              fontWeight: 500,
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {createdAt.format('HH:mm')}
                          </Typography>

                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{
                              display: 'block',
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {createdAt.format('DD.MM.YY')}
                          </Typography>
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant='body2'
                        title={originalPreview}
                        sx={{
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 3,
                          lineHeight: 1.4,
                          whiteSpace: 'pre-line',
                          wordBreak: 'break-word',
                        }}
                      >
                        {originalPreview}
                      </Typography>
                    </TableCell>

                    <TableCell align='center'>
                      <Stack
                        direction='row'
                        spacing={0.35}
                        sx={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexWrap: 'nowrap',
                          whiteSpace: 'nowrap',
                          minWidth: 'max-content',
                          pt: 0.1,
                        }}
                      >
                        <Button
                          variant='outlined'
                          size='small'
                          endIcon={<Download />}
                          onClick={() => {
                            download(
                              record.originalText.map(getTranscriptLinePlain),
                              `${record.title}-original.txt`,
                            )
                          }}
                          sx={downloadButtonSx}
                        >
                          original
                        </Button>

                        <Button
                          variant='outlined'
                          size='small'
                          endIcon={<Download />}
                          onClick={() => {
                            download(
                              record.translatedText.map(getTranscriptLinePlain),
                              `${record.title}-prelozk.txt`,
                            )
                          }}
                          sx={downloadButtonSx}
                        >
                          Přełožk
                        </Button>

                        <Tooltip title='Zhašeć'>
                          <Box
                            component='span'
                            sx={{
                              display: 'inline-flex',
                              flexShrink: 0,
                            }}
                          >
                            <IconButton
                              size='small'
                              aria-label='delete record'
                              disabled={isDeleting}
                              onClick={() => setRecordToDelete(record)}
                              sx={deleteButtonSx}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        <TablePagination
          component='div'
          count={total}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={event => {
            const next = Number.parseInt(event.target.value, 10)
            setRowsPerPage(next)
            setPage(0)
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',

            '& .MuiSvgIcon-root': {
              fill: 'black',
            },

            '& .MuiSelect-select': {
              color: 'black',
              WebkitTextFillColor: 'black',
            },
          }}
        />
      </TableContainer>

      <Dialog
        open={Boolean(recordToDelete)}
        onClose={() => {
          if (!isDeleting) setRecordToDelete(null)
        }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'background.paper',
              color: 'text.primary',
            },
          },
        }}
      >
        <DialogTitle>Zapisk zhašeć?</DialogTitle>

        <DialogContent>
          <DialogContentText color='text.secondary'>
            Chceš tutu zapisk woprawdźe zhašeć?
            {recordToDelete?.title ? ` ("${recordToDelete.title}")` : ''}
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button disabled={isDeleting} onClick={() => setRecordToDelete(null)}>
            Přetorhnyć
          </Button>

          <Button
            color='error'
            variant='contained'
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <Delete />}
            onClick={onConfirmDelete}
          >
            Zhašeć
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default HistoryScreen
