
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, SideMenuWrapper } from '../styles/commonStyles';
import {
  ContentArea, PostDetailContainer, PostHeader, PostTitle,
  PostContent, PostMeta, PostAuthor, PostDate,
  PostActions, LikeButton, LikeIcon, ImageContainer,
  PostImage, ImagePagination, PaginationDot, CommentsSection,
  CommentsSectionTitle, CommentItem, CommentHeader, CommentAuthor,
  CommentDate, CommentContent, CommentButton, CommentIcon,
  CommentLikeInfo, ReplyIndicator, CommentInput, CommentInputContainer,
  CommentSubmitButton, CommentHeaderActions, CommentActionButton,
  Divider,
} from '../styles/postDetailStyles';
import HomeIconMenu from '../../../components/HomeIconMenu';
import Header from '../components/BoardHeader';
import ActionSheet from '../components/ActionSheet';
import Modal from '../components/Modal';
import useModal from '../hooks/useModal';
import usePosts from '../hooks/usePosts';
import LikePink from '../components/Icons/LikePink.svg';
import Like from '../components/Icons/Like.svg';
import Comment from '../components/Icons/Comment.svg';
import Edit from '../components/Icons/Edit.svg';
import Delete from '../components/Icons/Delete.svg';
import Tab from '../components/Icons/Tab.svg';
import Lock from '../components/Icons/Lock.svg';
import useResponsive from '../hooks/useResponsive'

const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getPost, getComments } = usePosts();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const { isOpen: isActionSheetOpen, openModal: openActionSheet, closeModal: closeActionSheet } = useModal();
  const { isOpen: isDeleteModalOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
  const [selectedComment, setSelectedComment] = useState(null);

  const currentUserId = 'currentUser';
  const isPC = useResponsive();
  
  // 댓글 정렬 함수
  const sortCommentsWithReplies = (commentList) => {
    const result = [];
    
    // 원댓글들을 먼저 시간순으로 정렬
    const parentComments = commentList
      .filter(comment => comment.parentId === null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 각 원댓글에 대해 모든 관련 대댓글들을 찾아서 배치
    parentComments.forEach(parentComment => {
      result.push(parentComment);
      
      // 이 원댓글과 관련된 모든 대댓글들을 찾기
      // (직접 대댓글 + 대댓글의 대댓글 모두 포함)
      const getAllRelatedReplies = (rootId) => {
        const directReplies = commentList.filter(comment => comment.parentId === rootId);
        let allReplies = [...directReplies];
        
        // 대댓글의 대댓글들도 재귀적으로 찾기
        directReplies.forEach(reply => {
          const subReplies = getAllRelatedReplies(reply.id);
          allReplies.push(...subReplies);
        });
        
        return allReplies;
      };
      
      // 관련된 모든 대댓글들을 시간순으로 정렬해서 추가
      const allReplies = getAllRelatedReplies(parentComment.id)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      result.push(...allReplies);
    });
    
    return result;
  };
  
  // 게시글 및 댓글 데이터 로드
  useEffect(() => {
    const foundPost = getPost(id);
    const foundComments = getComments(id);
    
    if (foundPost) {
      setPost({ ...foundPost, isLiked: false });
      // 댓글을 원댓글 + 대댓글 그룹핑으로 정렬
      const sortedComments = sortCommentsWithReplies(
        foundComments.map(comment => ({ ...comment, isLiked: false }))
      );
      
      setComments(sortedComments);
    } else {
      navigate('/board');
    }
  }, [id, getPost, getComments, navigate]);

  // 댓글 추가 (단일 깊이)
  const handleCommentSubmit = () => {
    if (!commentText.trim()) return;

    const newComment = {
      id: Date.now(),
      author: '익명',
      content: commentText,
      date: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
      userId: currentUserId,
      parentId: replyingTo ? replyingTo.id : null,
      likes: 0,
      isLiked: false
    };
    
    // 새 댓글을 추가하고 다시 정렬
    const updatedComments = sortCommentsWithReplies([...comments, newComment]);
    
    setComments(updatedComments);
    setCommentText('');
    setReplyingTo(null);
  };

  // 게시글 좋아요 토글
  const handlePostLike = () => {
    setPost(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1
    }));
  };

  // 댓글 좋아요 토글
  const handleCommentLike = (commentId) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked: !comment.isLiked,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
        };
      }
      return comment;
    }));
  };

  // 댓글 삭제 - 단순화
  const handleCommentDelete = (commentId) => {
    // 삭제할 댓글의 대댓글 존재 여부 확인
    const hasReplies = comments.some(comment => comment.parentId === commentId);
    
    if (hasReplies) {
      // 대댓글이 있는 경우: 삭제 표시만 하고 댓글 유지
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isDeleted: true,
            content: '',
            author: '',
          };
        }
        return comment;
      }));
    } else {
      // 대댓글이 없는 경우: 완전 삭제
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    }
    
    closeDeleteModal();
  };

  // 대댓글 시작
  const handleReply = (comment) => {
    setReplyingTo(comment);
  };

  if (!post) return null;
  const isMyPost = post.userId === currentUserId;

  // 게시글 옵션 액션시트
  const postActions = [
    {
      icon: <img src={Edit} alt="수정" width="20" height="20" />,
      label: '수정하기',
      type: 'edit',
      onClick: () => navigate(`/board/edit/${id}`)
    },
    {
      icon: <img src={Delete} alt="삭제" width="20" height="20" />,
      label: '삭제하기',
      type: 'delete',
      onClick: () => {
        closeActionSheet();
        openDeleteModal();
      }
    }
  ];

  // 모달 액션
  const deleteModalActions = [
    {
      label: '취소',
      type: 'cancel',
      onClick: closeDeleteModal
    },
    {
      label: '삭제',
      type: 'confirm',
      onClick: () => {
        if (selectedComment) {
          handleCommentDelete(selectedComment.id);
        } else {
          // 게시글 삭제 로직
          navigate('/board');
        }
      }
    }
  ];

  return (
    <Container>
      {!isPC && (
        <Header
          title={post.category}
          showBack={true}
          myPost={isMyPost ? openActionSheet : undefined}
        />
      )}

      <SideMenuWrapper>
        <HomeIconMenu isWeb={true} />
      </SideMenuWrapper>

      <ContentArea>
        <PostDetailContainer>
          {/* 게시글 헤더 */}
          <PostHeader>
            {isPC && ( 
              <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                <PostTitle>{post.title}</PostTitle>
                <div style={{marginBottom: '12px', fontSize: '16px', fontWeight: 'bold', color: '#F67676'}}>
                  {post.category === 'general' ? '일반' : '홍보' }
                </div>
              </div>
            )}
            <PostMeta>
              <PostAuthor>{post.author}</PostAuthor>
              <PostDate>{post.date}</PostDate>
            </PostMeta>
            {!isPC && ( <PostTitle>{post.title}</PostTitle> )}
          </PostHeader>

          {/* 게시글 내용 */}
          <PostContent>{post.content}</PostContent>

          {/* 게시글 이미지 */}
          {post.image && post.image.length > 0 && (
            <ImageContainer>
              <PostImage 
                src={Array.isArray(post.image) ? post.image[currentImageIndex] : post.image} 
                alt="게시글 이미지" 
              />
              {Array.isArray(post.image) && post.image.length > 1 && !isPC && (
                <ImagePagination>
                  {post.image.map((_, index) => (
                    <PaginationDot
                      key={index}
                      active={index === currentImageIndex}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </ImagePagination>
              )}
            </ImageContainer>
          )}

          {/* 게시글 좋아요 */}
          {!isPC && (
          <PostActions>
            <LikeButton liked={post.isLiked} onClick={handlePostLike}>
              <LikeIcon src={LikePink} alt="좋아요" />
              좋아요
            </LikeButton>
          </PostActions>
          )}

          <Divider />

          {/* 댓글 섹션 */}
          <CommentsSection>
            <CommentsSectionTitle>댓글 {comments.length}개</CommentsSectionTitle>

            {/* PC 댓글 입력 */}
            {isPC && (
              <CommentInputContainer>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}> 
                  <div style={{ 
                    display: 'flex', flexDirection: 'column', height: '67%', 
                    padding: '20px 16px 8px 16px', gap: '10px', borderBottom: '1px solid #DDDDDD'
                  }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '500', padding: '4px 0px' }}>하지희</div>
                      {replyingTo && (
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#999', 
                          padding: '6px 8px',
                          background: '#f5f5f5',
                          borderRadius: '4px'
                        }}>
                          {replyingTo.author}님에게 답글 작성 중
                          <button 
                            onClick={() => setReplyingTo(null)}
                            style={{ 
                              marginLeft: '8px', 
                              background: 'none', 
                              border: 'none', 
                              color: '#999',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    <CommentInput
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="댓글을 입력하세요..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSubmit();
                        }
                      }}
                    />
                  </div>
                  <div style={{ 
                    display: 'flex', flexDirection: 'row', height: '33%', justifyContent: 'space-between', 
                    padding: '16px 20px', alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <img src={Lock} alt="lock" width="24" height="24" />
                      <div style={{ fontSize: '16px', fontWeight: '500', color: '#929292' }}>익명</div>
                    </div>
                    <CommentSubmitButton onClick={handleCommentSubmit}>
                      등록
                    </CommentSubmitButton>
                  </div>
                </div>
              </CommentInputContainer>
            )}
            
            {/* 개별 댓글 */}
            {comments.map((comment) => (
              <CommentItem key={comment.id} replyLevel={comment.parentId ? 1 : 0}>
                {comment.parentId && (
                  <ReplyIndicator>
                    {!isPC && ( <img src={Tab} alt="대댓글" width="20" height="20" /> )}
                    {isPC && ( <img src={Tab} alt="대댓글" width="24" height="24" /> )}
                  </ReplyIndicator>
                )}
                <div>
                  {/* 삭제된 댓글 표시 처리 */}
                  {comment.isDeleted ? (
                    // 삭제된 댓글 표시
                    <div style={{
                      padding: '12px 0',
                      color: '#999',
                      fontStyle: 'italic',
                      fontSize: '13px'
                    }}>
                      삭제된 댓글입니다.
                    </div>
                  ) : (
                    <>
                      <CommentHeader>
                        <div>
                          <CommentAuthor>
                            {comment.userId === post.userId ? '작성자' : comment.author}
                          </CommentAuthor>
                          <CommentDate>{comment.date}</CommentDate>
                        </div>
                        
                        <CommentHeaderActions>
                          {comment.userId !== currentUserId && (
                            <CommentButton onClick={() => handleCommentLike(comment.id)}>
                              <CommentIcon 
                                src={comment.isLiked ? LikePink : Like} 
                                alt="좋아요" 
                              />
                            </CommentButton>
                          )}
                          
                          {/* 대댓글 버튼 - 모든 댓글에 표시 */}
                          <CommentButton onClick={() => handleReply(comment)}>
                            <CommentIcon src={Comment} alt="대댓글" />
                          </CommentButton>

                          {comment.userId === currentUserId && (
                            <>
                              <CommentActionButton onClick={() => console.log('수정')}>
                                수정
                              </CommentActionButton>
                              <CommentActionButton 
                                onClick={() => {
                                  setSelectedComment(comment);
                                  openDeleteModal();
                                }}
                                className="delete"
                              >
                                삭제
                              </CommentActionButton>
                            </>
                          )}
                        </CommentHeaderActions>
                      </CommentHeader>
                      
                      <CommentContent>{comment.content}</CommentContent>
                      
                      {comment.likes > 0 && (
                        <CommentLikeInfo>
                          <img src={isPC ? Like : LikePink } alt="좋아요" width={isPC ? '28px' : '20px' } height={isPC ? '28px' : '20px' } />
                          <span>{comment.likes}</span>
                        </CommentLikeInfo>
                      )}
                    </>
                  )}
                </div>
              </CommentItem>
            ))}
          </CommentsSection>
        </PostDetailContainer>
      </ContentArea>

      {/* 모바일 댓글 입력 */}
      {!isPC && (
      <CommentInputContainer>
        {replyingTo && (
          <div style={{ 
            fontSize: '12px', 
            color: '#999', 
            marginBottom: '8px',
            padding: '4px 8px',
            background: '#f5f5f5',
            borderRadius: '4px'
          }}>
            {replyingTo.author}님에게 답글 작성 중
            <button 
              onClick={() => setReplyingTo(null)}
              style={{ 
                marginLeft: '8px', 
                background: 'none', 
                border: 'none', 
                color: '#999',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <CommentInput
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요..."
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCommentSubmit();
              }
            }}
          />
          <CommentSubmitButton onClick={handleCommentSubmit}>
            등록
          </CommentSubmitButton>
        </div>
      </CommentInputContainer>
      )}

      {/* 액션시트 */}
      <ActionSheet
        isOpen={isActionSheetOpen}
        onClose={closeActionSheet}
        title="게시글"
        actions={postActions} 
      />

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title={selectedComment ? "댓글을 삭제하시겠어요?" : "게시글을 삭제하시겠어요?"}
        actions={deleteModalActions}
      />
    </Container>
  );
};

export default PostDetailPage;